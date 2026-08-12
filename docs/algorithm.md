# L3判定アルゴリズム (Phase 1) — algorithm.md

最終更新: 2026-08-13
前提: `docs/requirements.md` §4(二軸モデル)。調査担当: algorithm-agent。
本書はレベル判定(特にL3横軸)の手法選定・分類ロジック・評価設計を単独で規定する。

## 1. 問題設定

- 縦軸(一般頻度)で候補プールを作り、横軸(分野でのズレ)で割る(要件 §4)。
- 横軸の課題: 頻度比(tf-idf的)は代理指標にすぎず、**頻度は不変で語義だけズレる語**(regular=正則, sound=健全)が漏れる。より直接的な信号は**共起語の分布差**(sample の隣: 一般= free/blood/take、cs.LG= distribution/i.i.d./minibatch)。
- この問題は**通時的意味変化検出(semantic change detection, SCD)と同型**である(時代軸→分野軸に置換)。SCDの標準ベンチマーク SemEval-2020 Task 1 の subtask2(変化度ランキング)のスコアで候補を並べて閾値を切る構図と数学的に同じ。先行研究が流用できる。
  - [SemEval-2020 Task 1](https://arxiv.org/abs/2007.11464)(33チーム186システム)
- **調査の重要な発見**: SemEval-2020 では **type-based(カウント/静的埋め込み)が token-based(BERT等)を明確に上回った**(BERTは対象語の綴り情報が上位層に漏れ語義クラスタを汚す — [敗因分析](https://arxiv.org/abs/2103.07259))。「ビルド時静的計算」という本製品の制約と精度がトレードオフにならず、**静的手法がそのまま正解**。

## 2. 手法比較

| 手法 | 検出できるL3タイプ | 漏れるタイプ | ビルド時コスト | 焼き込みサイズ | 実装難度 | 評価 |
|---|---|---|---|---|---|---|
| (a1) tf-idf/相対頻度比 | 頻度急増型(L2寄り) | **頻度不変・語義ズレ型が全滅** | 極小 | 極小 | 最易 | (a3)の劣位互換。不採用 |
| (a2) log-likelihood ratio | 頻度有意差型 | 同上。超高/低頻度で不安定 | 極小 | 極小 | 易 | (a3)の劣位互換。不採用 |
| **(a3) log-odds ratio + informative Dirichlet prior** ([Monroe et al. 2008](https://languagelog.ldc.upenn.edu/myl/Monroe.pdf)) | 頻度差型を最も頑健に検出。z-scoreで有意性つき | 頻度不変・語義ズレ型 | 極小 | 極小 | 易(公開実装多数) | **採用: 頻度軸の標準信号** |
| **(b) PPMI共起ベクトルのコーパス間JSD** ([JSDによるSCD](https://arxiv.org/html/2601.02891)) | **頻度不変・語義ズレ型を直接検出**(製品の核) | 共起が疎な低頻度語(L3は高頻度なので影響小) | 中(決定的・訓練分散なし) | 小(top-k共起語+スコア) | 中 | **採用: 語義軸の主力**。共起語がそのまま説明素材になる |
| (c) SGNS + Orthogonal Procrustes 整列 ([IMS, SemEval上位](https://arxiv.org/pdf/2008.03164)) | 語義ズレ型((b)と同種) | 同上 | 中〜大 | 小 | 中〜難(**訓練の乱数分散が地雷**) | 増強パスに温存(複数シード平均 or 低次元で対策) |
| (d) BERT トークン語義クラスタリング | 理論上最細粒度 | — | 大(GPU欲しい) | 小 | 難 | **不採用**: SemEvalで静的手法に敗北・費用対効果最低 |

## 3. Phase 2 最小構成(採用: 2信号)

ビルド時Nodeスクリプトで候補語ごとに以下を計算し、`{word, aFreq, keynessB, keynessC, senseShiftC, level, collGeneral[], collField[]}` を中間データに持つ(配信用 vocab_table にはL1a以外を焼く)。

### 縦軸: 候補プール
- wordfreq のZipf頻度で一般英語頻度 `aFreq` を取得。高頻度帯 → L3/L1a/L1b候補プール、低頻度帯 → L2候補プール。
- プール境界は「除外」ではなく振り分け(要件: L1除外工程を作らない)。全語をスコア付きで中間データに保持。

### 横軸・信号1(頻度成分): log-odds ratio + informative Dirichlet prior
- A-vs-C の z-score = `keynessC`(C突出=分野特化)、A-vs-B の z-score = `keynessB`(B突出=論文英語)。

### 横軸・信号2(語義成分): PPMI共起 + JSD 【製品の核】
- コーパスA(生テキスト)とコーパスCで、各候補語の窓±5の共起ベクトルをPPMI化し、A vs C の Jensen-Shannon divergence = `senseShiftC`。
- JSDは有界・対称・決定的(訓練不要)で、再現性=精度測定の前提に合致。
- top-k共起語(A側 `collGeneral` / C側 `collField`)も保存。「なぜ危険か」のUI説明素材とデバッグ可視化を兼ねる。

### 分類ロジック

```
高aFreq & (senseShiftC ≥ θs または keynessC ≥ θk) → L3(最優先)
高aFreq & senseShiftC < θs & keynessC < θk
        & keynessB ≥ θb & keynessC < θk            → L1b(論文英語層)
高aFreq & すべて閾値下                              → L1a(非表示・保留)
低aFreq & keynessC ≥ θk                            → L2(中優先)
```

- **復活パス(必須)**: L1a語も全スコアを保持し「非表示フラグを立てるだけで行を消さない」。senseShiftC / keynessC が閾値超過なら L3 へ昇格。
- **デバッグ出力(必須)**: `debug_l1a.json` に「L1a判定になった高aFreq語の上位N件(senseShiftC降順)」を出力。kernel / regular / sample / sound / plant / tight / dense が混ざっていれば閾値誤り(発注者が目視確認)。
- 閾値 θ は正解セットに合わせ込まず、**スコア分布の形状(肘・分位点)で決める**(§6-2)。

### 語義説明(domainSense / contrast)の生成 — Phase 2 は静的
- LLMは使わない(判定にも説明にも。順序厳守)。Phase 2 の説明文は:
  1. L3上位語(正解セット近傍+スコア上位N語)は**手書き**
  2. 全L3語に `collGeneral` vs `collField` の共起語対比を自動表示(「一般では loud/hear と並ぶが、この分野では stability/proof と並ぶ」)
- 手書きが追いつかない・質が不足すると確認できてから (c)ハイブリッド(実行時LLM)へ。

## 4. 増強パス(再現率70%未達の場合、この順)

1. 共起窓・PPMI閾値・top-k のチューニング(コスト最小)
2. コーパスCを abstract → 全文に拡張(共起の疎性改善)
3. (c) SGNS+OP のグローバル変化スコアを第3信号に追加(複数シード平均で分散対策)
4. (d) BERT は原則使わない(最終手段としても費用対効果が低い)

思想: 1信号(頻度)で骨格 → 2信号目(共起)で製品価値 → データ拡張 → 埋め込み。

## 5. コーパス調達とライセンス

**大原則: GitHub Pages で再配布するのは集計値(頻度・共起カウント・JSD・近傍語リスト)のみ。生テキスト全文は配らない。** この前提で以下すべて帰属表示付きで配布可能。

| 役割 | 推奨ソース | 入手 | ライセンス/集計値再配布 | 注意 |
|---|---|---|---|---|
| A 頻度 | **wordfreq** | pip / MIT | 集計値再配布OK(SUBTLEX系は要帰属) | 2024年にsunsetだが最終版で本用途に十分([SUNSET.md](https://github.com/rspeer/wordfreq/blob/master/SUNSET.md)) |
| **A 共起** | **Wikipediaサンプル or OpenSubtitles** | dump / OPUS | CC-BY-SA / 配布可 | **最重要の落とし穴: wordfreq は頻度リストのみで共起を持たない**。語義軸には一般英語の生テキストが別途必須 |
| B 学術一般 | **arXiv全分野abstractのランダムサンプル**(第一候補)/ S2ORC(大規模版) | Kaggle arXiv / S2ORC bulk API | arXiv abstract=CC0 / S2ORC=ODC-BY 1.0 | COCA-Academic は再配布不可のため除外。S2ORCは規模が要ると分かってから |
| C 分野 | **Kaggle arXiv dataset** の cs.RO + cs.LG | [Kaggle](https://www.kaggle.com/datasets/Cornell-University/arxiv)(週次更新) | metadata(abstract含む)= **CC0** | cs.LG単独で年4.6万件級。abstractで数千万トークン規模が見込め高頻度L3語の共起には十分 |

サイズ試算: 候補語 数千〜1万 × (スコア数個 + top-10共起語×2) ≒ 1語数百バイト → **総計 数百KB〜1MB**。上限5MB・目標1MB以下に収まる。

## 6. 評価設計

### 6-1. 正解セットの形式(これが決まり次第、発注者が20語を記入)

YAML配列(`eval/goldset.yaml`)。**`expected_signal` が切り分けレポートの肝**(どの軸で捕まるべき語かを事前宣言し、実際に落ちた段と突合する)。

```yaml
- word: sound
  expected_level: L3          # L3 / L2 / L1b / L1a
  field_sense: "健全性(soundness/well-posedness)、安定"
  general_sense: "音、鳴る"
  expected_signal: sense_shift  # frequency_shift / sense_shift / both
  general_collocates: [loud, hear, wave]        # 任意(診断の答え合わせ用)
  field_collocates: [stability, proof, controller]  # 任意
  notes: "頻度不変・語義ズレの典型。頻度比では絶対に漏れる"
```

- 必須: `word, expected_level, field_sense, general_sense, expected_signal`。任意: collocates, notes
- **負例セットも同形式で別ファイル**(`eval/negatives.yaml`、`expected_level: not_L3`)を15〜30語。例: matrix / algorithm(技術語だが語義がズレない)、the / of(機能語)

### 6-2. 再現率・適合率
- **再現率** = 正解L3 20語中、L3判定できた数 / 20。**目標 ≥70%(≥14語)**
- **適合率**: 正解20語では母数不足のため、システムのL3判定上位N語(top-50)を手動採点する precision@N + 負例混入率で測る
- **閾値の決め方**: スコア分布の形状(肘・分位点)で先に決定し、正解セットは検証専用に隔離(20語への過適合=リークを防ぐ)

### 6-3. 取りこぼし切り分けレポート(必須要件)

取りこぼした各語について「どの段で落ちたか」を排他的に特定する診断テーブルを評価スクリプトが自動生成する:

| 落ちた段 | 意味 | 改善アクション |
|---|---|---|
| 1. 候補プールミス | aFreq閾値で弾かれ横軸判定に未到達 | 縦軸の境界を緩める |
| 2. 横軸-頻度信号ミス | プール入りしたが keynessC が閾値下 | θk / コーパスC規模 |
| 3. 横軸-語義信号ミス | プール入りしたが senseShiftC が閾値下 | 共起窓・PPMI・コーパス拡張(増強パス1-2) |
| 4. 復活パス漏れ | L1a落ち後、復活ロジックが拾えず | 復活条件の閾値 |

出力例:

| 語 | expected_signal | aFreq | プール | keynessC | senseShiftC | 判定 | 落ちた段 |
|---|---|---|---|---|---|---|---|
| sound | sense_shift | 高 | ✓ | 1.2 | 0.31(閾値下) | L1a | 3. 語義信号ミス |
| kernel | both | 中 | ✗ | — | — | 非候補 | 1. 候補プールミス |

`expected_signal` × 「落ちた段」の突合で改善アクションが一意に決まる(sense_shift 期待語が段3で落ちる→共起手法のチューニング、段1が多い→縦軸を緩める)。

## 7. 検討課題の結論

### A. 中間層コーパス(denote, admissible, bound, converge)の要否 → **まず3本で測る。第4は作らない(条件付き保留)**
- この層は学術Bに広く出るため、B-vs-C keyness では「Cで特に突出しない」= L1b に落ちるのが理論的期待。B単独で吸収できる公算が高い。
- 検証手順: 手ラベル済みプローブ集合(15語程度: denote/admissible/bound/converge/hence/yield…)を分類に通し誤分類率を測る。
- 第4コーパス投入の判定基準: プローブ誤分類率 >30% かつ誤りがこの層に体系的に集中する場合のみ「STEM一般」層を追加。

### B. L3-academic(significant=有意, control=対照群, argue/suggest)→ **独立レベルにしない。L1bに畳む(条件付き再検討)**
- 独立させると語義判定をB軸でも回す必要が生じ実装が倍化する一方、読者(制御系エンジニア)への便益は二次的。コストに見合わない。
- A-vs-B keyness は信号1でどうせ計算するため、**内部スコアは持つがUIには独立露出しない**。
- 再検討基準: 正解セット20語に学術レジスタ型が複数含まれ、体系的に取りこぼされた場合のみ昇格。

## 8. リスクと未解決点

1. **wordfreq に共起はない**(§5)。一般英語の生テキストAの調達を Phase 2 冒頭のタスクに明示する。見落とすと頻度比しか作れず核心要件が実装不能。
2. **コーパスサイズ非対称と共起の疎性**: A と C で規模が桁違い。共起確率を正規化し、必要なら sub-sampling でトークン数を揃える。abstract のみだと中頻度語で疎 → 増強パス2。
3. **20語での閾値過適合**: 分布ベースで閾値決定、正解セットは検証専用(§6-2)。負例セットで適合率の暴走を監視。
4. **cs.RO+cs.LG を1分野に束ねる前提は実測未検証**: ビルド後に両サブコーパス間のJSDを一度測り、束ねてよいか確認する工程を入れる(コスト小)。
5. **分野軸SCDの公表精度数値は乏しい**: 70%目標は他タスク(SemEval)からの外挿。Phase 2 の正解セット実測まで確定しない。切り分けレポートが最初のイテレーションで効く設計にしてある。
6. SGNS採用時(増強パス3)の訓練分散 → 複数シード平均 or 低次元(d=5でも高性能の報告あり)。
