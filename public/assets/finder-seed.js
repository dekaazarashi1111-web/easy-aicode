(function (root, factory) {
  const seed = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = seed;
  }
  root.FINDER_SEED = seed;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  return {
    schemaVersion: 1,
    activeProfileId: "soft-romance-lab",
    siteProfiles: [
      {
        id: "soft-romance-lab",
        slug: "soft-romance-lab",
        name: "やわらか嗜好作品ファインダー",
        shortName: "やわらか嗜好",
        heroTitle: "曖昧な好みを、細かい条件に変えて作品を探す",
        heroDescription:
          "甘め、切なすぎない、NTRなし、短め、年上ヒロイン寄りなど、粗いストア検索では拾いにくい条件から作品を探すための土台です。",
        searchPlaceholder: "例: 夜に静かに読める / 面倒見がいい / 短め",
        visibleTagGroupIds: ["mood", "relationship", "pace", "focus", "avoid"],
      },
      {
        id: "drama-balance-lab",
        slug: "drama-balance-lab",
        name: "温度差ドラマ作品ファインダー",
        shortName: "温度差ドラマ",
        heroTitle: "強すぎないドラマを、条件で迷わず絞り込む",
        heroDescription:
          "切なさは欲しいが重すぎる展開は避けたい、といった中間の条件で候補を整理するための予備プロファイルです。",
        searchPlaceholder: "例: 切なめ / 暗すぎない / 再会もの",
        visibleTagGroupIds: ["mood", "relationship", "pace", "focus", "avoid"],
      },
    ],
    tagGroups: [
      { id: "mood", label: "雰囲気" },
      { id: "relationship", label: "関係性" },
      { id: "pace", label: "進み方" },
      { id: "focus", label: "見どころ" },
      { id: "avoid", label: "除外したい要素" },
    ],
    tags: [
      {
        id: "gentle",
        label: "甘め",
        groupId: "mood",
        isPublic: true,
        synonyms: ["やさしめ", "糖度高め"],
      },
      {
        id: "bittersweet",
        label: "切なめ",
        groupId: "mood",
        isPublic: true,
        synonyms: ["少し切ない", "ほろ苦い"],
      },
      {
        id: "calm",
        label: "静かめ",
        groupId: "mood",
        isPublic: true,
        synonyms: ["落ち着いた", "会話中心"],
      },
      {
        id: "older-heroine",
        label: "年上ヒロイン",
        groupId: "relationship",
        isPublic: true,
        synonyms: ["年上", "お姉さん寄り"],
      },
      {
        id: "caretaking",
        label: "面倒見がいい",
        groupId: "relationship",
        isPublic: true,
        synonyms: ["世話焼き", "支えてくれる"],
      },
      {
        id: "distance-close",
        label: "距離が近い",
        groupId: "relationship",
        isPublic: true,
        synonyms: ["会話が多い", "距離感が近い"],
      },
      {
        id: "slow-burn",
        label: "じっくり進展",
        groupId: "pace",
        isPublic: true,
        synonyms: ["ゆっくり進む", "丁寧に積み上がる"],
      },
      {
        id: "short-length",
        label: "短め",
        groupId: "pace",
        isPublic: true,
        synonyms: ["短編寄り", "重くない尺"],
      },
      {
        id: "drama-light",
        label: "ドラマ控えめ",
        groupId: "focus",
        isPublic: true,
        synonyms: ["重くない", "穏やか"],
      },
      {
        id: "dialogue-strong",
        label: "会話が魅力",
        groupId: "focus",
        isPublic: true,
        synonyms: ["掛け合いが良い", "空気感が良い"],
      },
      {
        id: "reunion",
        label: "再会もの",
        groupId: "focus",
        isPublic: true,
        synonyms: ["久々の再会", "再会系"],
      },
      {
        id: "no-ntr",
        label: "NTRなし",
        groupId: "avoid",
        isPublic: true,
        synonyms: ["横取りなし", "寝取られなし"],
      },
      {
        id: "low-violence",
        label: "暴力描写ひかえめ",
        groupId: "avoid",
        isPublic: true,
        synonyms: ["暴力少なめ", "荒くない"],
      },
      {
        id: "low-gore",
        label: "流血描写ひかえめ",
        groupId: "avoid",
        isPublic: true,
        synonyms: ["グロ控えめ", "刺激弱め"],
      },
      {
        id: "staff-pick",
        label: "運営おすすめ",
        groupId: "focus",
        isPublic: false,
        synonyms: [],
      },
    ],
    works: [
      {
        id: "work-quiet-library",
        slug: "quiet-library-midnight",
        siteProfileIds: ["soft-romance-lab"],
        status: "published",
        title: "深夜図書室の片想い",
        shortDescription:
          "静かな会話の積み重ねで距離が縮まっていく、夜向けの穏やかな作品サンプルです。",
        publicNote:
          "会話の空気感とじっくり進む関係性が主軸で、重すぎる展開を避けたい条件に合わせやすい作品です。",
        internalNote:
          "検索流入は『静かめ』『NTRなし』『面倒見がいい』を想定。トップ掲載候補。",
        tagIds: [
          "gentle",
          "calm",
          "older-heroine",
          "distance-close",
          "slow-burn",
          "dialogue-strong",
          "no-ntr",
          "low-violence",
        ],
        primaryTagIds: ["gentle", "calm", "older-heroine", "no-ntr"],
        collectionIds: ["late-night-gentle", "no-hard-turns"],
        priority: 10,
        releasedAt: "2026-03-01",
        updatedAt: "2026-03-23",
        externalLinks: [
          {
            id: "link-quiet-library",
            label: "DMMで作品を見る",
            partner: "DMM",
            url: "https://example.com/dmm/quiet-library-midnight",
          },
        ],
      },
      {
        id: "work-weekend-atelier",
        slug: "weekend-atelier-warmth",
        siteProfileIds: ["soft-romance-lab", "drama-balance-lab"],
        status: "published",
        title: "週末アトリエのぬくもり",
        shortDescription:
          "世話焼きな年上ヒロインと、休日に少しずつ関係が進むやわらかい作品サンプルです。",
        publicNote:
          "面倒見の良さと甘めの会話が中心で、短めの作品を探したい条件にも合わせやすい一本です。",
        internalNote:
          "『年上ヒロイン』『短め』『甘め』の交差検索用。DMMリンク差し替え前提。",
        tagIds: [
          "gentle",
          "older-heroine",
          "caretaking",
          "distance-close",
          "short-length",
          "dialogue-strong",
          "no-ntr",
          "drama-light",
        ],
        primaryTagIds: ["gentle", "older-heroine", "short-length", "no-ntr"],
        collectionIds: ["soft-start-pack"],
        priority: 20,
        releasedAt: "2026-02-18",
        updatedAt: "2026-03-22",
        externalLinks: [
          {
            id: "link-weekend-atelier",
            label: "DMMで作品を見る",
            partner: "DMM",
            url: "https://example.com/dmm/weekend-atelier-warmth",
          },
        ],
      },
      {
        id: "work-rainy-platform",
        slug: "rainy-platform-reunion",
        siteProfileIds: ["soft-romance-lab", "drama-balance-lab"],
        status: "published",
        title: "雨上がりホームの再会",
        shortDescription:
          "再会要素は欲しいが重すぎる展開は避けたい人向けに置く、切なめ寄りの作品サンプルです。",
        publicNote:
          "少し切ない再会ものですが、暴力描写や強い刺激は抑えめで、余韻を楽しみたい条件に向いています。",
        internalNote:
          "『再会もの』『切なめ』『流血描写ひかえめ』の需要確認用。公開継続。",
        tagIds: [
          "bittersweet",
          "calm",
          "reunion",
          "slow-burn",
          "dialogue-strong",
          "no-ntr",
          "low-gore",
        ],
        primaryTagIds: ["bittersweet", "reunion", "slow-burn", "no-ntr"],
        collectionIds: ["late-night-gentle"],
        priority: 30,
        releasedAt: "2026-01-30",
        updatedAt: "2026-03-20",
        externalLinks: [
          {
            id: "link-rainy-platform",
            label: "DMMで作品を見る",
            partner: "DMM",
            url: "https://example.com/dmm/rainy-platform-reunion",
          },
        ],
      },
      {
        id: "work-summer-mail",
        slug: "summer-mail-distance",
        siteProfileIds: ["soft-romance-lab"],
        status: "hold",
        title: "夏の未送信メール",
        shortDescription:
          "静かな雰囲気はあるが、ややドラマが強く検索意図に合うか確認中の保留作品です。",
        publicNote:
          "保留中サンプルのため非公開。手動キュレーションで再評価する想定です。",
        internalNote:
          "『静かめ』『切なめ』では候補になるが、求める温度感より重い可能性あり。保留。",
        tagIds: ["bittersweet", "calm", "slow-burn", "reunion", "low-violence"],
        primaryTagIds: ["bittersweet", "calm", "reunion"],
        collectionIds: [],
        priority: 40,
        releasedAt: "2025-12-12",
        updatedAt: "2026-03-23",
        externalLinks: [
          {
            id: "link-summer-mail",
            label: "DMMで作品を見る",
            partner: "DMM",
            url: "https://example.com/dmm/summer-mail-distance",
          },
        ],
      },
      {
        id: "work-city-lights",
        slug: "city-lights-afterglow",
        siteProfileIds: ["drama-balance-lab"],
        status: "draft",
        title: "街灯りの余白",
        shortDescription:
          "別テーマ用の下書き作品サンプルです。ドラマ寄りのプロファイルでのみ候補化する想定です。",
        publicNote:
          "下書きのため公開前提ではありません。プロファイル別運用の確認用です。",
        internalNote:
          "温度差ドラマ向けのテストデータ。soft-romance-lab には出さない。",
        tagIds: ["bittersweet", "dialogue-strong", "slow-burn", "low-gore"],
        primaryTagIds: ["bittersweet", "dialogue-strong"],
        collectionIds: [],
        priority: 50,
        releasedAt: "2026-03-10",
        updatedAt: "2026-03-23",
        externalLinks: [
          {
            id: "link-city-lights",
            label: "DMMで作品を見る",
            partner: "DMM",
            url: "https://example.com/dmm/city-lights-afterglow",
          },
        ],
      },
    ],
    collections: [
      {
        id: "late-night-gentle",
        slug: "late-night-gentle",
        siteProfileIds: ["soft-romance-lab"],
        title: "夜に静かに読みたい穏やか作品",
        description:
          "会話の空気感が強く、重すぎる展開を避けたいときに向く作品をまとめた仮の特集です。",
        tagIds: ["calm", "slow-burn", "no-ntr"],
        workIds: ["work-quiet-library", "work-rainy-platform"],
        isPublic: true,
      },
      {
        id: "soft-start-pack",
        slug: "soft-start-pack",
        siteProfileIds: ["soft-romance-lab"],
        title: "入口向けの短め作品",
        description:
          "初回導線で迷いやすいユーザー向けに、短めで条件が分かりやすい作品を寄せた仮の特集です。",
        tagIds: ["gentle", "short-length", "drama-light"],
        workIds: ["work-weekend-atelier"],
        isPublic: true,
      },
      {
        id: "no-hard-turns",
        slug: "no-hard-turns",
        siteProfileIds: ["soft-romance-lab", "drama-balance-lab"],
        title: "強い地雷を避けたいときの候補",
        description:
          "除外条件を重視する検索需要を拾うための特集です。刺激の強い要素を避けたいときの入口として使います。",
        tagIds: ["no-ntr", "low-violence", "low-gore"],
        workIds: ["work-quiet-library", "work-rainy-platform"],
        isPublic: true,
      },
    ],
    logs: {
      events: [],
    },
  };
});
