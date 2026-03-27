(function (root, factory) {
  const articles = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = articles;
  }
  root.ARTICLE_INDEX = articles;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  return [
    {
      slug: "content-planning-checklist",
      url: "/articles/content-planning-checklist/",
      title: "記事構成を先に決めるチェックリスト",
      summary: "検索意図、見出し、内部リンク、CTA の置き場を先に決めるためのガイド記事サンプルです。",
      type: "使い方ガイド",
      tags: ["構成", "検索意図", "内部リンク", "CTA"],
      keywords: [
        "記事構成",
        "検索意図",
        "キーワード設計",
        "内部リンク",
        "CTA",
        "記事作成手順",
      ],
      publishedAt: "2026-03-23",
    },
    {
      slug: "comparison-template",
      url: "/articles/comparison-template/",
      title: "比較記事ページの組み方",
      summary: "比較軸、結論、選び方、広告リンクの置き方を確認するための見本です。",
      type: "比較記事",
      tags: ["構成", "広告表記", "比較表", "CTA"],
      keywords: [
        "比較記事",
        "比較構成",
        "比較軸",
        "結論",
        "選び方",
        "案件リンク",
        "比較表",
      ],
      publishedAt: "2026-03-23",
    },
    {
      slug: "review-structure",
      url: "/articles/review-structure/",
      title: "レビュー記事で抜けやすい確認項目",
      summary: "メリットと注意点の両方を書ききるための骨組みを整理しています。",
      type: "レビュー記事",
      tags: ["構成", "広告表記", "注意点", "体験談"],
      keywords: [
        "レビュー記事",
        "体験談",
        "注意点",
        "メリット",
        "デメリット",
        "広告表記",
        "比較対象",
      ],
      publishedAt: "2026-03-23",
    },
    {
      slug: "article-layout-test",
      url: "/articles/article-layout-test/",
      title: "記事レイアウト確認用テスト",
      summary: "画像、図版、要点カードを含む記事詳細ページの仮レイアウト確認用テスト記事です。",
      type: "使い方ガイド",
      tags: ["レイアウト", "画像", "テスト", "余白"],
      keywords: [
        "記事レイアウト",
        "記事詳細ページ",
        "画像テスト",
        "図版",
        "余白確認",
        "仮ページ",
      ],
      publishedAt: "2026-03-27",
    },
  ];
});
