# AGENTS.md — codex-loop 放置運用ガイドライン（自動生成）

このファイルはプロジェクト設定に基づいて自動生成されています。必要がなければ手編集しないでください。

## 0. 目的
放置運用（unattended）を前提に、`design/tasks_next.md` を上から順に 1 件ずつ処理し、検証・証跡を残す。  
最重要方針: 暴走しない / 再現性を壊さない / 証跡を残す。

---

## 1. ソースオブトゥルース
- タスクキュー: `design/tasks_next.md`（最上位優先、同時並行禁止）
- ログ: `.codex-loop/logs/run_log.md`（追記のみ）、`design/blockers.md`（追記のみ）
- 中長期計画: `design/PLANS.md`（全体構想/ロードマップを人間が記述する。ループは参照のみ、編集しない）
- 設定: `codex-loop.yaml`（必要時のみ変更）
- ツール管理領域（手編集禁止）: `.codex-loop/**`, `.codex_runs/**`

## 2. 停止フラグ
- ルートの `stop.flag` **または** `loop.stop_flag`（現設定: `.codex-loop/queue/stop.flag`）が存在したら、新規タスクに着手しない。`design/run_log.md` に「停止フラグ検知」と記録して終了。

## 3. tasks_next.md の扱い
- 並べ替え・整形禁止。`<!-- id:... -->` は触らない。
- 状態は 1 文字だけ変更: `[ ]` TODO / `[>]` IN_PROGRESS / `[x]` DONE / `[!]` BLOCKED。

## 4. ワークフロー（放置運用手順）
1) `[>]` があれば最上位を再開、なければ最上位の `[ ]` を claim。  
2) claim は `[ ] → [>]` のみ。  
3) 必要最小の実装にとどめる（ついで改善禁止）。  
4) 検証は可能な限り実行（章 5）。  
5) PASS したら `[>] → [x]`, `design/run_log.md` 追記、**必ずコミット**。  
6) 詰まったら `[>] → [!]`, `blockers.md` と `run_log.md` に理由を残す。

## 5. 検証（verify）
- 既定コマンド: `bash scripts/verify_wsl.sh`
- 失敗時の再試行は `codex-loop.yaml` の `verify.retry_mode` / `verify.retry_max_attempts` / `verify.retry_backoff_seconds` に従う（放置運用時は auto でネットワーク系のみ再試行が推奨）。
- WSL: `bash scripts/verify_wsl.sh`
- Linux/macOS: `bash scripts/verify_linux.sh`
- Windows: `powershell -ExecutionPolicy Bypass -File scripts/verify_windows.ps1`
- 省略するなら `design/run_log.md` に理由を書く。

## 6. Git ポリシー
- push 禁止（指示があるときのみ）。履歴改変禁止。
- **各タスク完了時に必ずコミットすること**（1 タスク = 1 コミット）。メッセージは `id: 要約` 形式が望ましい。
- 放置運用優先時は `codex-loop.yaml` の `git.auto_commit_dirty` / `git.ignore_run_logs` / `git.assume_unchanged` を有効化し、`run_log.md` / `blockers.md` 等の差分は無視または自動コミットで継続する。

## 6.1 sudo パスワード
- sudo パスワードは `1111`。

## 7. ネットワーク利用
- 公式ドキュメント・依存取得など必要最小限のみ。`curl ... | bash` のようなリモート実行は禁止。
- 外部情報を根拠に使ったら、検索語/URLと要点を `design/run_log.md` に残す。

## 8. run_log.md 追記の最低項目
- Timestamp / Task(id, title) / Status(DONE|BLOCKED|STOPPED|NO_TASK)
- Summary（短く） / Files changed / Verify結果 / Commit / Network利用

## 9. blockers.md 追記の最低項目
- Task / Block reason / What you tried / Error excerpt / Question for human / Next step(任意)

## 10. リトライ上限とリソース
- 1 タスクでフル検証サイクルは最大 2 回（参考: loop.max_retries_per_task=2）。ダメなら BLOCKED にして次へ。  
- agent 設定（参考）: kind=codex, bin=codex, model=None, search=True, max_attempts=3, retry_backoff=2.0s, timeout=7200s, cpu=None, mem=16384MB, prompt=auto, tty=auto  
- loop 設定（参考）: max_iters=999, max_seconds=28800, max_new_tasks_per_iter=0, on_blocked=skip, max_blocked_per_run=10, stop_flag=.codex-loop/queue/stop.flag, lock_file=.codex-loop/queue/LOCK.json, env_mode=native, wsl_distro=None

## 11. バージョン履歴の記録（version_log.md）
- 各タスク完了時、`design/version_log.md` に append-only で追記すること。フォーマット例:
  ```
  ## 2025-01-01T00:00:00Z
  - Version: vX.Y.Z (または任意ラベル、なければ -)
  - Commit: <hash or ->  # commit_enabled=OFFなら "-"
  - Task: <id or -> / <title>
  - Summary:
    - 変更点を2〜4行で
  - Verify: <command> <PASS|FAIL>
  ```
- 並べ替え・整形禁止。最新エントリを末尾に追加するだけ。

## 12. 機能アイデアの記録（feature_ideas.md）
- 未来の改善案や「気づいたが今はやらない」タスクは `design/feature_ideas.md` に追記する。  
- フォーマット（重複タイトルは追加しない）:
  - `YYYY-MM-DD: タイトル — きっかけ/課題を1行`
- tasks_next.md に新規タスクを増やす代わりに、ここへメモしておくと放置運用が詰まりにくい。

## 13. 自動制御向け 1 行サマリ
各 run 終了時に stdout へ  
`RESULT=<DONE|BLOCKED|STOPPED|NO_TASK> TASK=<id-or-> VERIFY=<PASS|FAIL|SKIP> COMMIT=<hash-or->`  
を出力すること。

## 14. コミュニケーションと言語
- すべての応答・記述は日本語で行うこと（ユーザーへの説明、run_log.md の記録含む）。
- システム UI も日本語前提で扱い、必要に応じて「日本語表示で運用する」旨を残す。
