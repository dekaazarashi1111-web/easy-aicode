// Cloudflare Pages Function:
// /unsubscribe/:token を「PCに依存せず」処理する。
//
// 推奨: D1 に配信停止を記録（常時稼働）。
// 互換: D1 未設定時は、従来どおり Flask へプロキシ（MAILER_BACKEND_BASE_URL）。
//
// 必要な環境変数（Pages 側）:
// - APP_SECRET_KEY: メーラーと同じ値（token 検証用）
// - UNSUB_DB: D1 binding（任意だが推奨）
// - MAILER_BACKEND_BASE_URL: 後方互換のプロキシ先（D1未設定時のみ）

function escHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function htmlPage(title: string, badge: string, message: string, detail?: string, extraHtml?: string) {
  const esc = (s: string) =>
    escHtml(s);

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <style>
    :root{--bg:#f5f7fb;--card:#fff;--muted:#6b7280;--text:#0f172a;--border:#e5e7eb;--shadow:0 10px 25px rgba(15,23,42,.06);}
    *{box-sizing:border-box}
    body{margin:0;font-family:"Noto Sans JP","Segoe UI",system-ui,-apple-system,sans-serif;background:linear-gradient(180deg,#f8fafc 0%,#eef2ff 38%,#f8fafc 100%);color:var(--text);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;overflow-wrap:anywhere}
    .card{max-width:720px;width:100%;background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px;box-shadow:var(--shadow)}
    h1{font-size:20px;margin:0 0 8px}
    .tag{display:inline-flex;align-items:center;border:1px solid var(--border);border-radius:999px;padding:2px 10px;font-size:12px;color:var(--muted);background:#f8fafc}
    .msg{font-weight:700;margin:10px 0 6px}
    .muted{color:var(--muted);font-size:13px;line-height:1.5}
    .actions{margin-top:14px;display:flex;gap:10px;flex-wrap:wrap}
    .btn{appearance:none;border:1px solid var(--border);border-radius:12px;padding:10px 14px;font-weight:700;font-size:14px;cursor:pointer}
    .btn-danger{background:#dc2626;color:#fff;border-color:#dc2626}
    .btn-ghost{background:#fff;color:var(--text)}
  </style>
</head>
<body>
  <div class="card">
    <h1>配信停止のご案内</h1>
    <div><span class="tag">${esc(badge)}</span></div>
    <div class="msg">${esc(message)}</div>
    ${detail ? `<div class="muted">${esc(detail)}</div>` : ""}
    ${extraHtml || ""}
    <div class="muted" style="margin-top:14px">
      本ページは配信停止専用です。誤ってクリックされた場合は閉じて問題ありません。
    </div>
  </div>
</body>
</html>`;
}

function bytesToHex(bytes: ArrayBuffer) {
  const u8 = new Uint8Array(bytes);
  let out = "";
  for (const b of u8) out += b.toString(16).padStart(2, "0");
  return out;
}

async function buildSigTrunc16(secret: string, companyId: number) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const msg = enc.encode(`unsubscribe:${companyId}`);
  const sig = await crypto.subtle.sign("HMAC", key, msg);
  return bytesToHex(sig).slice(0, 16);
}

async function ensureSchema(db: any) {
  // ループ運用でも安全な IF NOT EXISTS。初回のみコストが乗る。
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS unsubscribes (
        company_id INTEGER PRIMARY KEY,
        token TEXT,
        created_at TEXT NOT NULL
      )`,
    )
    .run();
}

function htmlConfirmForm(request: Request) {
  const pathname = new URL(request.url).pathname;
  // pathname はサーバ側生成だが、念のためエスケープして埋め込む
  const action = escHtml(pathname);
  return `
    <div class="muted" style="margin-top:12px">配信停止を確定するには、下のボタンを押してください。</div>
    <form method="post" action="${action}">
      <div class="actions">
        <button class="btn btn-danger" type="submit">配信停止する</button>
        <a class="btn btn-ghost" href="https://wintergator.com/">キャンセル</a>
      </div>
    </form>
  `;
}

function makeHtmlResponse(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

function parseCompanyIdAndSig(token: string): { companyId: number; sig: string } | null {
  try {
    const [cidStr, sig] = token.split("-", 2);
    const companyId = Number(cidStr);
    if (!Number.isInteger(companyId) || companyId <= 0) return null;
    if (!sig) return null;
    return { companyId, sig };
  } catch {
    return null;
  }
}

async function validateTokenOrNull(env: any, token: string) {
  const secret = String(env?.APP_SECRET_KEY || "");
  if (!secret) return { ok: false as const, error: "APP_SECRET_KEY is not set" };
  const parsed = parseCompanyIdAndSig(token);
  if (!parsed) return { ok: false as const, error: "invalid token" };
  const expected = await buildSigTrunc16(secret, parsed.companyId);
  if (parsed.sig !== expected) return { ok: false as const, error: "invalid token" };
  return { ok: true as const, companyId: parsed.companyId };
}

async function proxyUnsubscribeHtml(backendBase: string, request: Request, token: string) {
  const base = backendBase.replace(/\/+$/, "");
  const url = new URL(`${base}/unsubscribe/${encodeURIComponent(token)}`);
  url.search = new URL(request.url).search;

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { accept: "text/html,*/*", "user-agent": "cf-pages-unsubscribe-proxy" },
  });
  const headers = new Headers(res.headers);
  headers.set("cache-control", "no-store");
  if (!headers.get("content-type")) headers.set("content-type", "text/html; charset=utf-8");
  return new Response(await res.text(), { status: res.status, headers });
}

export async function onRequestGet({ params, request, env }: any) {
  const token = params?.token;
  if (!token || typeof token !== "string") {
    return makeHtmlResponse(
      htmlPage("配信停止", "無効なURL", "配信停止URLが正しくありません。", "お手数ですが、このメールを破棄してください。"),
      400,
    );
  }

  // GET では確定しない（リンクスキャン対策）。確定は POST のボタン押下のみ。
  const db = env?.UNSUB_DB;
  if (db) {
    const v = await validateTokenOrNull(env, token);
    if (!v.ok) {
      const status = v.error === "APP_SECRET_KEY is not set" ? 500 : 400;
      const detail =
        status === 500 ? "APP_SECRET_KEY が未設定です。" : "お手数ですが、このメールを破棄してください。";
      const badge = status === 500 ? "エラー" : "無効なURL";
      const message = status === 500 ? "システム設定エラーが発生しました。" : "配信停止URLが正しくありません。";
      return makeHtmlResponse(htmlPage("配信停止", badge, message, detail), status);
    }
    const companyId = v.companyId;

    await ensureSchema(db);
    const existing = await db
      .prepare("SELECT company_id FROM unsubscribes WHERE company_id = ?")
      .bind(companyId)
      .first();
    if (existing) {
      return makeHtmlResponse(
        htmlPage("配信停止", "すでに配信停止済み", "すでに配信停止の設定が完了しています。", "今後、この宛先には営業メールをお送りしません。"),
        200,
      );
    }

    return makeHtmlResponse(
      htmlPage("配信停止", "確認", "配信停止の確認", "この操作を確定すると今後メールをお送りしません。", htmlConfirmForm(request)),
      200,
    );
  }

  // 互換: D1 が無い場合はバックエンドへプロキシ。
  // GET では確定させず、POST でのみバックエンドの処理を呼ぶ。
  const backendBase = String(env?.MAILER_BACKEND_BASE_URL || "").replace(/\/+$/, "");
  if (!backendBase) {
    return makeHtmlResponse(
      htmlPage("配信停止", "エラー", "システム設定エラーが発生しました。", "UNSUB_DB または MAILER_BACKEND_BASE_URL を設定してください。"),
      500,
    );
  }

  return makeHtmlResponse(
    htmlPage("配信停止", "確認", "配信停止の確認", "この操作を確定すると今後メールをお送りしません。", htmlConfirmForm(request)),
    200,
  );
}

export async function onRequestPost({ params, request, env }: any) {
  const token = params?.token;
  if (!token || typeof token !== "string") {
    return makeHtmlResponse(
      htmlPage("配信停止", "無効なURL", "配信停止URLが正しくありません。", "お手数ですが、このメールを破棄してください。"),
      400,
    );
  }

  const db = env?.UNSUB_DB;
  if (db) {
    const v = await validateTokenOrNull(env, token);
    if (!v.ok) {
      const status = v.error === "APP_SECRET_KEY is not set" ? 500 : 400;
      const detail =
        status === 500 ? "APP_SECRET_KEY が未設定です。" : "お手数ですが、このメールを破棄してください。";
      const badge = status === 500 ? "エラー" : "無効なURL";
      const message = status === 500 ? "システム設定エラーが発生しました。" : "配信停止URLが正しくありません。";
      return makeHtmlResponse(htmlPage("配信停止", badge, message, detail), status);
    }
    const companyId = v.companyId;

    await ensureSchema(db);
    const existing = await db
      .prepare("SELECT company_id FROM unsubscribes WHERE company_id = ?")
      .bind(companyId)
      .first();
    if (existing) {
      return makeHtmlResponse(
        htmlPage("配信停止", "すでに配信停止済み", "すでに配信停止の設定が完了しています。", "今後、この宛先には営業メールをお送りしません。"),
        200,
      );
    }

    const now = new Date().toISOString();
    await db
      .prepare("INSERT INTO unsubscribes (company_id, token, created_at) VALUES (?, ?, ?)")
      .bind(companyId, token, now)
      .run();

    return makeHtmlResponse(
      htmlPage("配信停止", "配信停止完了", "配信停止の設定が完了しました。", "今後、この宛先には営業メールをお送りしません。"),
      200,
    );
  }

  const backendBase = String(env?.MAILER_BACKEND_BASE_URL || "").replace(/\/+$/, "");
  if (!backendBase) {
    return makeHtmlResponse(
      htmlPage("配信停止", "エラー", "システム設定エラーが発生しました。", "UNSUB_DB または MAILER_BACKEND_BASE_URL を設定してください。"),
      500,
    );
  }

  try {
    return await proxyUnsubscribeHtml(backendBase, request, token);
  } catch {
    return makeHtmlResponse(htmlPage("配信停止", "エラー", "システム設定エラーが発生しました。", "バックエンドへの接続に失敗しました。"), 500);
  }
}
