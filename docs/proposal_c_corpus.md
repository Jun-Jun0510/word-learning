# 提案: Cコーパスの構成(収集前に承認を得る)

作成日: 2026-08-13
背景: Phase 2a レビュー判断2。現状 C = cs.LG 9.1k + cs.RO 9.1k abstracts(各カテゴリ最新順、目標の4割)。
問題: cs.LG の音響・NLP・vision 系論文が語彙を支配し、sound の C側共起が respiratory/music/acoustic になる等、読者が実際に読む manipulation / VLA / sim-to-real 系と乖離する。

## 提案A(推奨): ロボティクス重心 + 音響除外

| バケット | 定義 | トークン比率目標 | 件数目安 |
|---|---|---|---|
| R | カテゴリに cs.RO を含む論文(クロスリスト含む) | **60%** | 45,000 abstracts |
| L | cs.LG を含み cs.RO を含まない論文のうち、**音響系(eess.AS / cs.SD クロスリスト)を除外**したもの | **40%** | 30,000 abstracts |

- 合計 約75,000 abstracts ≈ 11Mトークン(現状の3.3倍)
- **cs.RO∩cs.LG クロスリスト(学習ロボティクス = VLA / sim-to-real / 模倣学習の主生息域)は R に入る**ため、読者の読書リストの中心が最も厚くなる
- **音響系のみ明示除外**(sound 問題の直接対処)。cs.CV / cs.CL クロスリストは**残す** — VLA は vision-language-action であり、attention / grounding / prompt 系の語彙はむしろ必要
- NLP純粋系(cs.CL主・cs.LG従)は L に混ざるが、比率40%の中で薄まる。全除外はしない(policy gradient 系理論や attention の語彙源として有用)

### 収集方法
- arXiv API の offset 9100 制限は **submittedDate の日付スライス**(例: 半年窓でクエリ分割)で回避
- R は年数を遡って全量(cs.RO は年産が小さいため 2019〜2026 で約45k)
- L は新しい順(VLA時代の語彙を優先。2024〜2026 で30k確保可能)
- カテゴリフィルタは取得後にメタデータの categories フィールドで適用(APIクエリは cat:cs.RO / cat:cs.LG のまま)

### 検証(収集後に必ず実施)
1. **sound の before/after**: C側共起(現状: respiratory/music/acoustic)と判定の変化を提示
2. 凍結20語の**回帰テスト**(壊れていないかの確認のみ。性能主張には使わない)
3. θrr マージン(return / robot 間)の再計測 → 判断1の「原理的限界かデータ不足か」の切り分け
4. cs.RO−cs.LG 間 JSD 中央値による「束ねてよいか」検証(algorithm.md §5、未実施のまま)

## 代替案(比較用)

| 案 | 内容 | 利点 | 欠点 |
|---|---|---|---|
| B: cs.RO 単独 | L を捨てて R 100% | 読書リストとの一致は最大 | regret / flat minima / augmentation 等の純ML語彙が薄くなり、cs.LG 論文を読む時に効かない。ブリーフの「cs.RO + cs.LG を1分野として扱う」に反する |
| C: 現状維持(均等・無フィルタ) | 単純に量だけ3倍化 | 実装が最も楽 | sound 問題が温存され、音響・NLP語彙の支配が続く |

## 決めてほしいこと

1. 提案A(R60/L40・音響除外)で収集に入ってよいか
2. 音響以外に除外したい cs.LG サブ領域はあるか(例: 純理論の最適化系、金融応用系)
3. R の遡り年数(2019〜で提案。古い年代は語彙が VLA 以前になるが量が稼げる)
