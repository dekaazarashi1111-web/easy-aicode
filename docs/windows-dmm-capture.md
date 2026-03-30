# Windows Chrome 用 DMM 取り込みメモ

## 目的

Windows 側で普段使っている Chrome から、DMM/FANZA 同人の作品詳細ページを開いたまま定型情報を抽出し、あとで Codex に加工させやすい JSON として保持するための導線です。

公開サイト本体とは分離し、作業用ツールとして追加しています。

## 追加ファイル

- `tools/dmm-capture/extension/`
- `tools/dmm-capture/server.js`
- `data/dmm-capture-inbox.json`

## できること

- Chrome で開いている DMM/FANZA 同人の作品詳細ページから定型情報を抽出
- タイトル、サークル、作者、価格、配信開始日、作品形式、ページ数、題材、ジャンル、ファイル容量、利用期限、作品コメント、画像URL などを JSON 化
- 登場人物や体型メモだけを手入力で追記
- JSON をコピー、ダウンロード、または WSL 側のローカル inbox に保存

## 使い方

### 1. WSL 側で保存サーバーを起動

```bash
node tools/dmm-capture/server.js
```

デフォルトは `http://127.0.0.1:43123` です。

Windows からつながらない場合だけ、次で再起動してください。

```bash
DMM_CAPTURE_HOST=0.0.0.0 node tools/dmm-capture/server.js
```

それでも `127.0.0.1` で届かない場合は、WSL 側で `hostname -I` を実行して IP を確認し、レビュー画面の `Server URL` を `http://<WSLのIP>:43123` に変えてください。

### 2. Windows Chrome に拡張を読み込む

Chrome の `chrome://extensions/` を開き、デベロッパーモードを ON にして「パッケージ化されていない拡張機能を読み込む」を押します。

読み込むフォルダ:

`\\wsl.localhost\Ubuntu\home\user\projects\html_editer\tools\dmm-capture\extension`

### 3. ショートカットを確認

既定ショートカットは `Ctrl+Shift+Y` です。

うまく反応しない場合は `chrome://extensions/shortcuts` で変更してください。

### 4. DMM/FANZA 同人の作品ページで取り込む

- Windows Chrome で作品詳細ページを開く
- `Ctrl+Shift+Y` を押す
- 拡張のレビュー画面が開く
- `登場人物・体型メモ` と `補足メモ` を必要に応じて入力
- `JSONをコピー` / `JSONを保存` / `inboxへ保存` のいずれかを使う

## 保存先

### 拡張内の一時保存

Chrome 拡張の `storage.local` に直近キャプチャを保持します。

### WSL 側の inbox 保存

`inboxへ保存` を押すと、次に書き込みます。

- `data/dmm-capture-inbox.json`
  - 最新サマリ一覧
- `data/dmm-capture-items/<captureId>.json`
  - フル JSON 本体

## JSON の考え方

キャプチャ JSON は大きく次に分かれています。

- `source`
  - どのページから取ったか
- `scraped`
  - 自動抽出した定型情報
- `manual`
  - 自分で追記する欄
- `sync`
  - inbox 保存の状態

この JSON をあとで Codex に渡せば、`data/work-library-db.json` への取り込みや、公開用データへの整形を進められます。
