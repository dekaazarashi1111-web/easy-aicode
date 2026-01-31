const DEFAULT_TTL_SECONDS = 259200;
const DEFAULT_MAX_DOWNLOADS = 3;
const SIGNATURE_TOLERANCE_SECONDS = 300;

const jsonResponse = (data, init = {}) =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

const toHex = (buffer) =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

const timingSafeEqual = (a, b) => {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
};

const verifyStripeSignature = async (rawBody, signatureHeader, secret) => {
  if (!signatureHeader || !secret) return false;
  const parts = signatureHeader.split(",").map((part) => part.trim());
  let timestamp = null;
  const signatures = [];

  for (const part of parts) {
    const [key, value] = part.split("=");
    if (key === "t") timestamp = Number(value);
    if (key === "v1" && value) signatures.push(value);
  }

  if (!timestamp || signatures.length === 0) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > SIGNATURE_TOLERANCE_SECONDS) return false;

  const signedPayload = `${timestamp}.${rawBody}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));
  const expected = toHex(signature);

  return signatures.some((sig) => timingSafeEqual(sig, expected));
};

const randomToken = (bytes = 32) => {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const sendMail = async ({ provider, apiKey, from, to, subject, text }) => {
  if (!provider || !apiKey || !from || !to) return false;
  if (provider === "mailchannels") {
    const payload = {
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from },
      subject,
      content: [{ type: "text/plain", value: text }],
    };
    const response = await fetch("https://api.mailchannels.net/tx/v1/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return response.ok;
  }

  if (provider === "resend") {
    const payload = {
      from,
      to: [to],
      subject,
      text,
    };
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    return response.ok;
  }
  return false;
};

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const rawBody = await request.text();
  const signatureHeader = request.headers.get("stripe-signature");
  const secret = env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    console.log("stripe-webhook: missing STRIPE_WEBHOOK_SECRET");
    return jsonResponse({ error: "missing secret" }, { status: 500 });
  }

  const isValid = await verifyStripeSignature(rawBody, signatureHeader, secret);
  if (!isValid) {
    console.log("stripe-webhook: invalid signature");
    return jsonResponse({ error: "invalid signature" }, { status: 400 });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch (error) {
    console.log("stripe-webhook: invalid json", error);
    return jsonResponse({ error: "invalid json" }, { status: 400 });
  }

  const eventType = event?.type;
  if (
    eventType !== "checkout.session.completed" &&
    eventType !== "checkout.session.async_payment_succeeded"
  ) {
    console.log("stripe-webhook: ignored event", eventType);
    return jsonResponse({ received: true });
  }

  const session = event?.data?.object;
  const sessionId = session?.id;
  if (!sessionId) {
    console.log("stripe-webhook: missing session id");
    return jsonResponse({ error: "missing session id" }, { status: 400 });
  }

  const paymentStatus = session?.payment_status;
  if (paymentStatus !== "paid") {
    console.log("stripe-webhook: not paid", sessionId, paymentStatus);
    return jsonResponse({ received: true });
  }

  const kv = env.WG_KV;
  if (!kv) {
    console.log("stripe-webhook: missing KV binding");
    return jsonResponse({ error: "missing KV" }, { status: 500 });
  }

  const existing = await kv.get(`sess:${sessionId}`, { type: "json" });
  if (existing) {
    console.log("stripe-webhook: already processed", sessionId);
    return jsonResponse({ received: true, alreadyProcessed: true });
  }

  const ttl = Number(env.TOKEN_TTL_SECONDS || DEFAULT_TTL_SECONDS);
  const maxDownloads = Number(env.MAX_DOWNLOADS || DEFAULT_MAX_DOWNLOADS);
  const now = Math.floor(Date.now() / 1000);
  const token = randomToken(32);
  const email = session?.customer_details?.email || session?.customer_email || "";
  const productCode = session?.metadata?.product_code || "";

  const record = {
    token,
    email,
    createdAt: now,
    expiresAt: now + ttl,
    downloads: 0,
    maxDownloads,
    product_code: productCode,
    sessionId,
  };

  await kv.put(`sess:${sessionId}`, JSON.stringify(record), { expirationTtl: ttl });
  await kv.put(`tok:${token}`, JSON.stringify(record), { expirationTtl: ttl });

  const dlUrl = `${new URL(request.url).origin}/dl?token=${token}`;
  const provider = env.MAIL_PROVIDER;
  const apiKey = env.MAIL_API_KEY || "";
  const from =
    env.FROM_EMAIL || env.SUPPORT_EMAIL || "support@wintergator.com";

  if (provider && email) {
    const subject = "Gator Companion ダウンロードのご案内";
    const text = `ご購入ありがとうございます。\n\nダウンロードはこちら:\n${dlUrl}\n\n有効期限: ${ttl}秒\n\nサポート: ${env.SUPPORT_EMAIL || "support@wintergator.com"}`;
    const sent = await sendMail({
      provider,
      apiKey,
      from,
      to: email,
      subject,
      text,
    });
    console.log("stripe-webhook: mail sent", sessionId, sent);
  } else {
    console.log("stripe-webhook: mail skipped", sessionId);
  }

  console.log("stripe-webhook: processed", sessionId, eventType);
  return jsonResponse({ received: true });
}
