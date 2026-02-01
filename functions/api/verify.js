const DEFAULT_TTL_SECONDS = 259200;
const DEFAULT_MAX_DOWNLOADS = 3;

const jsonResponse = (data, init = {}) =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

const randomToken = (bytes = 32) => {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id");
  if (!sessionId) {
    return jsonResponse({ ok: false, reason: "missing_session_id" }, { status: 400 });
  }

  const kv = env.WG_KV;
  if (!kv) {
    return jsonResponse({ ok: false, reason: "missing_kv" }, { status: 500 });
  }

  const secret = env.STRIPE_SECRET_KEY || env.STRIPE_API_KEY;
  if (!secret) {
    return jsonResponse({ ok: false, reason: "missing_stripe_secret" }, { status: 500 });
  }

  const existing = await kv.get(`sess:${sessionId}`, { type: "json" });
  if (existing?.token) {
    const dlUrl = `${url.origin}/dl?token=${existing.token}`;
    return jsonResponse({
      ok: true,
      token: existing.token,
      download: [{ url: dlUrl, filename: "IchimeAI-Setup.exe" }],
    });
  }

  let session;
  try {
    const stripeResponse = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${sessionId}`,
      {
        headers: {
          Authorization: `Bearer ${secret}`,
        },
      }
    );
    if (!stripeResponse.ok) {
      return jsonResponse({ ok: false, reason: "stripe_error" }, { status: 400 });
    }
    session = await stripeResponse.json();
  } catch (error) {
    return jsonResponse({ ok: false, reason: "stripe_error" }, { status: 500 });
  }

  const paymentStatus = session?.payment_status;
  if (paymentStatus !== "paid") {
    return jsonResponse({ ok: false, reason: "not_paid", payment_status: paymentStatus });
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

  const dlUrl = `${url.origin}/dl?token=${token}`;
  return jsonResponse({
    ok: true,
    token,
    download: [{ url: dlUrl, filename: "IchimeAI-Setup.exe" }],
  });
}
