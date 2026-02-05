// Cloudflare Pages Function:
// 管理者用に、D1 に記録された配信停止（company_id）を削除する（テスト用）。
//
// 認証:
// - Authorization: Bearer <UNSUBSCRIBE_API_TOKEN>
//
// リクエスト:
// - POST /api/unsubscribed_reset
// - JSON: { "company_id": 123 }
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

export async function onRequestPost({ request, env }: any) {
  const db = env?.UNSUB_DB;
  if (!db) return json({ ok: false, error: "UNSUB_DB is not set" }, 500);

  const expected = String(env?.UNSUBSCRIBE_API_TOKEN || "");
  if (!expected) return json({ ok: false, error: "UNSUBSCRIBE_API_TOKEN is not set" }, 500);

  const auth = request.headers.get("authorization") || "";
  if (auth !== `Bearer ${expected}`) return json({ ok: false, error: "unauthorized" }, 401);

  let payload: any = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }
  const companyId = Number(payload?.company_id);
  if (!Number.isInteger(companyId) || companyId <= 0) {
    return json({ ok: false, error: "company_id is required" }, 400);
  }

  await ensureSchema(db);
  const res = await db.prepare("DELETE FROM unsubscribes WHERE company_id = ?").bind(companyId).run();

  const deleted = Number((res as any)?.meta?.changes || 0);
  return json({ ok: true, company_id: companyId, deleted });
}

