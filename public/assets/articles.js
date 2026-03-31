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
      title: "Draw Two を初めて読む人向けの入口ガイド",
      summary:
        "『オオカミなんかこわくない！』『デビルなんかじゃないっ！』『BBB』の3作から、最初の1冊を選ぶための入口ガイドです。",
      type: "使い方ガイド",
      tags: ["入口", "初読", "Draw Two", "狼", "虎", "配達員"],
      keywords: [
        "Draw Two",
        "土狼弐",
        "オオカミなんかこわくない！",
        "デビルなんかじゃないっ！",
        "BBB",
        "ケモホモ 入口",
        "最初の1冊",
      ],
      publishedAt: "2026-03-31",
      relatedWorkSlugs: ["ookami-nanka-kowakunai", "devil-nanka-janai", "bbb"],
      relatedCollectionIds: ["start-here"],
      workTagIds: ["gateway-pick", "easy-entry", "species-wolf", "species-tiger", "species-dog"],
    },
    {
      slug: "comparison-template",
      url: "/articles/comparison-template/",
      title: "狼・虎・異世界で選ぶ Draw Two 入口3作比較",
      summary:
        "狼男ハロウィン、白虎の幼馴染、異世界男娼ものの3方向から、Draw Two の入口3作を比較しています。",
      type: "比較記事",
      tags: ["比較", "狼", "虎", "異世界", "Draw Two"],
      keywords: [
        "Draw Two 比較",
        "オオカミなんかこわくない！",
        "デビルなんかじゃないっ！",
        "だから俺は異世界で春を売る。",
        "狼 虎 異世界",
        "ケモホモ 比較",
      ],
      publishedAt: "2026-03-31",
      relatedWorkSlugs: ["ookami-nanka-kowakunai", "devil-nanka-janai", "dakara-haru-uru-1"],
      relatedCollectionIds: ["start-here", "tf-gateway"],
      workTagIds: ["species-wolf", "species-tiger", "motif-isekai", "gateway-pick"],
    },
    {
      slug: "review-structure",
      url: "/articles/review-structure/",
      title: "『だから俺は異世界で春を売る。』シリーズ読み分けレビュー",
      summary:
        "1巻から3巻までの広がり方、相手種族の傾向、どこから入ると読みやすいかをまとめたシリーズレビューです。",
      type: "レビュー記事",
      tags: ["レビュー", "シリーズ", "異世界", "男娼", "多種族"],
      keywords: [
        "だから俺は異世界で春を売る。",
        "だから俺は異世界で春を売る。2",
        "だから俺は異世界で春を売る。3",
        "異世界シリーズ",
        "Draw Two レビュー",
        "多種族",
      ],
      publishedAt: "2026-03-30",
      relatedWorkSlugs: ["dakara-haru-uru-1", "dakara-haru-uru-2", "dakara-haru-uru-3"],
      relatedCollectionIds: ["tf-gateway"],
      workTagIds: ["motif-isekai", "motif-sex-work", "species-multi", "species-bear", "species-lion"],
    },
    {
      slug: "article-layout-test",
      url: "/articles/article-layout-test/",
      title: "主従・幼馴染・年の差で読む関係性ガイド",
      summary:
        "『雨と嘘』『デビルなんかじゃないっ！』『カリソメオオカミ』『白熊執事、爽籟と共に』を関係性から選ぶためのガイドです。",
      type: "使い方ガイド",
      tags: ["関係性", "主従", "幼馴染", "年の差", "大型獣人"],
      keywords: [
        "雨と嘘",
        "デビルなんかじゃないっ！",
        "カリソメオオカミ",
        "白熊執事、爽籟と共に",
        "主従",
        "幼馴染",
        "年の差",
      ],
      publishedAt: "2026-03-29",
      relatedWorkSlugs: ["ame-to-uso", "devil-nanka-janai", "karisome-ookami", "booth-item-2427390"],
      relatedCollectionIds: ["safe-filters", "dense-fur-room"],
      workTagIds: ["motif-master-servant", "motif-childhood-friend", "motif-age-gap", "species-wolf", "species-bear"],
    },
  ];
});
