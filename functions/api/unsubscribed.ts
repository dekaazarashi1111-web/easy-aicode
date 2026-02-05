// Cloudflare Pages Function:
// 管理者用に、D1 に記録された配信停止（company_id）一覧を返す。
//
// 認証:
// - Authorization: Bearer <UNSUBSCRIBE_API_TOKEN>
//
// 必要な環境変数:
// - UNSUB_DB: D1 binding
// - UNSUBSCRIBE_API_TOKEN: 任意の長いランダム文字列

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

async function ensureSchema(db: any) {
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

export async function onRequestGet({ request, env }: any) {
  const db = env?.UNSUB_DB;
  if (!db) return json({ ok: false, error: "UNSUB_DB is not set" }, 500);

  const expected = String(env?.UNSUBSCRIBE_API_TOKEN || "");
  if (!expected) return json({ ok: false, error: "UNSUBSCRIBE_API_TOKEN is not set" }, 500);

  const auth = request.headers.get("authorization") || "";
  if (auth !== `Bearer ${expected}`) return json({ ok: false, error: "unauthorized" }, 401);

  await ensureSchema(db);

  const url = new URL(request.url);
  const since = (url.searchParams.get("since") || "").trim(); // ISO string (任意)
  const limitRaw = (url.searchParams.get("limit") || "").trim();
  const limit = Math.max(1, Math.min(10000, Number(limitRaw) || 5000));

  let rows: any[] = [];
  if (since) {
    rows =
      (
        await db
          .prepare(
            "SELECT company_id, created_at FROM unsubscribes WHERE created_at >= ? ORDER BY created_at ASC LIMIT ?",
          )
          .bind(since, limit)
          .all()
      )?.results || [];
  } else {
    rows =
      (
        await db
          .prepare("SELECT company_id, created_at FROM unsubscribes ORDER BY created_at ASC LIMIT ?")
          .bind(limit)
          .all()
      )?.results || [];
  }

  return json({ ok: true, count: rows.length, rows });
}

