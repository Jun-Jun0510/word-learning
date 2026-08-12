# 提案: 語義単位スキーマ(mass 問題への回答。実装は Phase 2b)

作成日: 2026-08-13
背景: Phase 2a レビュー判断3。「確率質量は未知だが物理質量は既知」という状態を保持するには、ステータス(new/learning/known)が語義単位である必要がある。2b でデータ構造を作ってから直すと作り直しになるため、先にスキーマを確定する。

## 設計原則

1. **検出は語単位のまま**(Phase 2a で実証済み。分類パイプラインは変更しない)
2. **ステータスと自己採点は語義単位**
3. **出現(sources / count)は語単位**(表層テキストからどの語義かを自動判別できないため、出現は語で数えるのが正直)
4. 語義データは**手キュレーション**(多義が問題になる L3 上位語のみ)。未整備語は「デフォルト語義1個」として語単位と同じ挙動 → 全語彙のキュレーションを前提としない
5. level 型は 'L3-academic' を後から追加可能な拡張列挙(phase1_approval.md、維持)

## vocab_table.json(配信側)

```jsonc
"mass": {
  "level": "L3",
  "score": 0.93,
  "collGeneral": ["destruction", "media", "body"],
  "collField": ["probability", "distribution", "function"],
  "senses": [                       // 手キュレーション。多義L3語のみ。省略時は単一デフォルト語義
    {
      "id": "mass#ml",              // 語義ID = 語 + '#' + 短slug。全データを通じた結合キー
      "domainSense": "probability mass — total probability in a region",
      "contrast": "not physical mass — a share of probability",
      "ja": "確率質量"
    },
    {
      "id": "mass#phys",
      "domainSense": "physical mass (dynamics, inertia)",
      "contrast": "(一般語義と同じ。cs.RO の動力学文脈)",
      "ja": "質量"
    }
  ]
}
```

- `senses` 省略時(大多数の語)は実行時に `{id: "<word>#default"}` 1個として扱う
- 将来(Phase 3)の拡張として語義ごとの `cues`(文書内でどの語義かを推定する共起手掛かり)を追加できるが、**Phase 2b では判別せず、known でない語義を全て提示する**(過剰設計回避)

## 単語帳DB(localStorage 側)

```jsonc
{
  "schemaVersion": 2,
  "words": {
    "mass": {
      "level": "L3",
      "sources": [                  // 語単位(出現は語で数える。原則3)
        { "docId": "a1b2c3d4e5f6", "title": "…", "count": 4, "sentence": "…" }
      ],
      "senses": {                   // ステータス・自己採点は語義単位(原則2)
        "mass#ml":   { "status": "new",   "selfCheck": [{ "docId": "…", "correct": true, "at": "2026-08-13" }], "updatedAt": "2026-08-13" },
        "mass#phys": { "status": "known", "selfCheck": [], "updatedAt": "2026-08-13" }
      },
      "updatedAt": "2026-08-13"
    }
  },
  "docs": { "a1b2c3d4e5f6": { "title": "…", "addedAt": "…", "l3Count": 12 } }
}
```

## 表示・操作規則

- **予習モード**: 文書に出現した語について、`status !== 'known'` の語義だけを行として表示。1語に未知語義が2つあれば2行(mass: 確率質量 / 物理質量)。**全語義が known になった語は語ごと消える**(「使うほど予習が軽くなる」導線は語義単位でそのまま成立)
- **1タップのステータス変更は語義行に対して**行う
- **単語帳モード**: 語で1行、タップで語義に展開。フィルタの「習得状況」は語義単位で評価(1語義でも known でない語は「学習中」扱い)
- 読了後チェック(○/×)も語義単位

## エクスポート/互換

- **JSONエクスポート**: スキーマそのまま(schemaVersion 付き)
- **CSV(Anki互換の平坦化)**: 1行 = 1語義。`word, senseId, level, ja, domainSense, contrast, status, 出現文書数`
- **マイグレーション**: schemaVersion 1(語単位 status)→ 2 は「既存 status を `<word>#default` に移す」だけ。損失なし
- インポート(マージ)の衝突規則: 語義単位で「より進んだ status を採用」(new < learning < known)。architecture.md §4.2 の docId ハッシュ・sources 和集合はそのまま

## 承認後の作業(Phase 2b)

- architecture.md §4.1 / §4.2 を本スキーマで置き換え
- types.ts に型定義(level は拡張可能列挙)
- mass / prior 等、正解セット近傍の多義L3語の senses を手書き(まず5〜10語で十分)
