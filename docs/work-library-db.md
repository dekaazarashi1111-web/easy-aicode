# 作品テキストDBメモ

## 目的

`public/assets/finder-seed.js` は公開表示向けの軽量データです。一方、`userfile/作品一覧` のテキストは、公開可否が未確定の作品や、将来 UI に出さない情報も含む元資料です。

そのため、今回のDB層は公開用seedの前段として分離しています。

- 元テキストをそのまま保持する
- 構造化した抽出結果も同時に持つ
- 後で `finder-seed.js` や別UIへ投影できる
- 手動注釈や公開判定をあとから足せる

## 関連ファイル

- `scripts/build_text_work_db.js`
- `data/work-library-db.json`

## 構成

`data/work-library-db.json` のトップレベルは次の単位で分かれています。

- `sourceLibrary`
  - 取り込み元フォルダ、取り込みスクリプト、パーサ版などの由来情報。
- `sourceDocuments`
  - 各 `.txt` の完全保持レイヤー。
  - `rawText` に生テキスト全文を保存。
  - `extracted` に、説明文、観測メモ、価格行、メタデータ行の抽出結果を保存。
- `creators`
  - ヘッダ行のサークル名や `作者` を集約した人物・サークル単位。
- `series`
  - `シリーズ` メタデータを作品横断で束ねた単位。
- `works`
  - 将来の公開用データ変換の起点になる正規化済み作品レコード。

## `works` の考え方

各作品は、表示向けの完成データではなく「公開前の母艦データ」として扱います。

- `titles`
  - 主タイトルとファイル名由来の別名。
- `sourceDocumentIds`
  - どの生テキストから来たかを追跡するための参照。
- `sourceRefs`
  - DMM/FANZA などの外部URLと外部ID。
- `contributors`
  - `circle` と `author` を分けて保持。
- `series`
  - シリーズ名と巻番号候補。
- `summaries`
  - 現状はストア説明文を格納。
- `characterObservations`
  - `狼→筋肉` のような観測メモを構造化。
- `storefrontListings`
  - 作品形式、ページ数、配信日、ジャンル、容量など、ストア断面の記録。
- `commercial`
  - 定価、セール価格、価格行の原文。
- `derived`
  - 検索やタグ化に使いやすい派生情報。
- `publication`
  - 将来 `finder-seed.js` へ出す時の割り当て予約領域。
- `custom`
  - 内部タグ、メモ、関連作品など、手動運用の拡張領域。

## 拡張方針

今後、同じ作品に別ソースを追加しても壊れにくいように、以下を分離しています。

- 生テキスト保持: `sourceDocuments`
- 抽出済み構造: `works`
- 横断参照: `creators` / `series`
- 公開判定・手動注釈: `publication` / `custom`

この形にしておくと、次のような追加がしやすくなります。

- 感想メモや読後メモの追記
- DMM以外の販売ページ追加
- 公開サイト用タグの割り当て
- 非公開作品と公開作品の分岐管理
- 記事や特集とのひも付け
