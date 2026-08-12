# L3判定アルゴリズム (Phase 1) — algorithm.md

最終更新: 2026-08-13(reviewer-agent 指摘反映済み。指摘一覧は `docs/review_phase1.md`)
前提: `docs/requirements.md` §4(二軸モデル)。調査担当: algorithm-agent。
本書はレベル判定(特にL3横軸)の手法選定・分類ロジック・評価設計を単独で規定する。

## 1. 問題設定

- 縦軸(一般頻度)で候補プールを作り、横軸(分野でのズレ)で割る(要件 §4)。
- 横軸の課題: 頻度比(tf-idf的)は代理指標にすぎず、**頻度は不変で語義だけズレる語**(regular=正則, sound=健全)が漏れる。より直接的な信号は**共起語の分布差**。
- この問題は**通時的意味変化検出(semantic change detection, SCD)と同型**(時代軸→分野軸に置換)。標準ベンチマーク SemEval-2020 Task 1 の subtask2(変化度ランキング)と数学的に同じ構図で、先行研究が流用できる。[SemEval-2020 Task 1](https://arxiv.org/abs/2007.11464)
- 調査の重要な発見: SemEval-2020(英語)では type-based(カウント/静的埋め込み)が token-based(BERT等)を上回った([敗因分析](https://arxiv.org/abs/2103.07259))。**本製品の制約(ビルド時静的計算・再現性重視)下では type-based が実務上の最適**であり、精度と制約がトレードオフにならない。

### 1.1 中核リスク: 「語義ズレ」と「話題ズレ」の分離 【最重要】

共起分布の差は、語義が置き換わった語(kernel, sound)だけでなく、**語義は不変で話題頻度だけ変わる語**(robot, controller, trajectory)でも大きくなる。後者は誤読を生まないためL3ではない。この2つを分離できないと、L3リストが話題語で薄まり製品価値が崩壊する。本書の分類ロジック(§3)は分離用の**語義置換指標**を持ち、PoC(§6-4)の最初の計測項目を「話題語混入率」とする。

## 2. 手法比較

| 手法 | 検出できるL3タイプ | 漏れるタイプ | ビルド時コスト | 焼き込みサイズ | 実装難度 | 評価 |
|---|---|---|---|---|---|---|
| (a1) tf-idf/相対頻度比 | 頻度急増型(L2寄り) | **頻度不変・語義ズレ型が全滅** | 極小 | 極小 | 最易 | (a3)の劣位互換。不採用 |
| (a2) log-likelihood ratio | 頻度有意差型 | 同上。超高/低頻度で不安定 | 極小 | 極小 | 易 | (a3)の劣位互換。不採用 |
| **(a3) log-odds ratio + informative Dirichlet prior** ([Monroe et al. 2008](https://languagelog.ldc.upenn.edu/myl/Monroe.pdf)) | 頻度差型を最も頑健に検出。z-scoreで有意性つき | 頻度不変・語義ズレ型 | 極小 | 極小 | 易(公開実装多数) | **採用: 頻度軸の標準信号** |
| **(b) 共起分布のコーパス間JSD**(§3で定義を厳密化) | **頻度不変・語義ズレ型を直接検出**(製品の核) | 共起が疎な低頻度語(L3は高頻度なので影響小)。**話題ズレとの混同(§1.1、語義置換指標で対処)** | 中(決定的・訓練分散なし) | 小(top-k共起語+スコア) | 中 | **採用: 語義軸の主力**。共起語がそのまま説明素材になる |
| (c) SGNS + Orthogonal Procrustes 整列 ([IMS, SemEval上位](https://arxiv.org/pdf/2008.03164)) | 語義ズレ型((b)と同種) | 同上 | 中〜大 | 小 | 中〜難(**訓練の乱数分散が地雷**) | 増強パスに温存(複数シード平均 or 低次元で対策) |
| (d) BERT トークン語義クラスタリング | 理論上最細粒度 | — | 大(GPU欲しい) | 小 | 難 | **不採用**: SemEval(EN)で静的手法に敗北・費用対効果最低 |

## 3. Phase 2a 採用構成

ビルド時Nodeスクリプトで候補語ごとに `{word, aFreq, keynessB, keynessC, senseShiftC, replaceGen, score, level, collGeneral[], collField[]}` を計算し中間データに全語保持(配信用 vocab_table にはL1a以外を焼く)。

### 縦軸: 候補プール
- wordfreq のZipf頻度 `aFreq`。高頻度帯 → L3/L1a/L1b候補プール、低頻度帯 → L2候補プール。
- プール境界は「除外」ではなく振り分け。全語をスコア付きで中間データに保持(L1除外工程は作らない)。

### 横軸・信号1(頻度成分): log-odds ratio + informative Dirichlet prior
- A-vs-C の z-score = `keynessC`(C突出=分野特化)、A-vs-B の z-score = `keynessB`(B突出=論文英語)。

### 横軸・信号2(語義成分): 共起分布JSD 【製品の核・定義を厳密化】

- 対象語 w ごとに、コーパスA・Cそれぞれで**条件付き文脈分布 P(c|w)**(窓±5、内容語のみ)を作る。
- **共通サポート**: 文脈語彙は A∩C の高頻度内容語 上位K語(初期値 K=10,000)に固定し、加算スムージング(add-λ)を適用。両分布は同じ台上の確率分布になる。
- `senseShiftC` = JSD(P_A(・|w) ‖ P_C(・|w))。JSDは有界・対称・決定的(訓練不要)。
- ※「PPMIベクトルをJSDにかける」は数理的に不整合(PPMIは非正規化スコアで確率分布でない)ため採らない。PPMIを使うならコサイン距離とセットだが、Phase 2a は確率分布+JSDに統一する。
- top-k共起語(A側 `collGeneral` / C側 `collField`)も保存(UI説明素材+デバッグ)。

### 語義置換指標 replaceGen(話題語ガード、§1.1 対応)

- `replaceGen(w)` = 1 −(A側 top-k 共起語が C の文脈分布で保持している確率質量の、A側での質量に対する比)
- 直観: **一般語義の隣人が分野コーパスで消えているか**。sound の隣の loud/hear は制御論文でほぼ消える(語義置換=L3)。robot の隣人は分野でも同種(話題語)。
- senseShiftC(分布全体のズレ)と replaceGen(一般語義側の消失)の組で「語義ズレ」と「話題ズレ」を分離する。**有効性はPoCで最初に実測する(§6-4)。**

### 分類ロジック

```
高aFreq:
  (senseShiftC ≥ θs かつ replaceGen ≥ θr)                → L3(語義置換型)
  (keynessC ≥ θk かつ senseShiftC ≥ θs2)  ※θs2 < θs      → L3(頻度急増型。緩い語義条件付き)
  keynessC ≥ θk だが上記いずれも不成立                     → 話題語疑い: 自動昇格させず L1a保留
                                                            + debug出力で目視(PoC実測後に扱いを確定)
  keynessB ≥ θb かつ keynessC < θk                         → L1b(論文英語層)
  その他                                                    → L1a(非表示・保留・全スコア保持)
低aFreq:
  keynessC ≥ θk                                            → L2(中優先)
  その他                                                    → 非収載(残余。中間データには保持)
  ※低aFreq語の senseShiftC は共起が疎で不安定なため判定に使わない
```

- **復活パスについて(要件§4との対応)**: 単一パスOR条件を採ったため、「L1a落ち後にCの信号で復活」は分類規則に**内包**されており、同一閾値の別機構を作ると空回りする。本設計での復活パスの実体は (1) L1a語も全スコアを中間データに保持し、(2) `debug_l1a.json` で目視検証し、(3) 閾値を調整して再ビルドすれば即座に再分類される、という運用である。別途の緩い復活閾値(θ_revive < θs)は過剰設計として置かない。
- **デバッグ出力(必須)**: `debug_l1a.json` に「L1a判定になった高aFreq語の上位N件(senseShiftC降順)」と「話題語疑いバケット全件」を出力。kernel / regular / sample / sound / plant / tight / dense が前者に混ざっていれば閾値誤り(発注者が目視確認)。
- 閾値 θ 群は正解セットに合わせ込まず、**スコア分布の形状(肘・分位点)で決める**(§6-2)。

### 危険度スコア(ソート用、vocab_table の `score`)

- pS = percentile(senseShiftC × replaceGen)(候補プール内での百分位)
- pK = percentile(keynessC)
- **score = max(pS, pK)**。予習モードのL3はこの降順で表示し、**上位30語を表示上限**とする(10〜15分制約。上限値はPoC後に調整)。

### 語義説明(domainSense / contrast)の生成 — Phase 2 は静的
- LLMは使わない(判定にも説明にも。順序厳守)。Phase 2 の説明文は:
  1. L3上位語(正解セット近傍+スコア上位N語)は**手書き**
  2. 全L3語に `collGeneral` vs `collField` の共起語対比を自動表示
- 手書きが追いつかない・質が不足すると確認できてから (c)ハイブリッド(実行時LLM)へ。

## 4. 増強パス(評価ゲート未達の場合、この順)

1. 共起窓・K・スムージングλ・top-k・θ群のチューニング(コスト最小)
2. コーパスCを abstract → 全文に拡張(共起の疎性改善)
3. (c) SGNS+OP のグローバル変化スコアを第3信号に追加(複数シード平均で分散対策)
4. (d) BERT は原則使わない(最終手段としても費用対効果が低い)

## 5. コーパス調達とライセンス

**大原則: GitHub Pages で再配布するのは集計値(頻度・共起カウント・JSD・近傍語リスト)のみ。生テキスト全文は配らない。** この前提で以下すべて帰属表示付きで配布可能。

| 役割 | 採用ソース | 入手 | ライセンス/集計値再配布 | 備考 |
|---|---|---|---|---|
| A 頻度 | **wordfreq** | pip / MIT | 集計値再配布OK(SUBTLEX系は要帰属) | 2024年sunsetだが最終版で本用途に十分([SUNSET.md](https://github.com/rspeer/wordfreq/blob/master/SUNSET.md)) |
| **A 共起** | **OpenSubtitles(OPUS)を第一候補** | OPUS | 配布可 | **wordfreqは頻度リストのみで共起を持たない**ため生テキストが別途必須。**Wikipediaは不採用**: 百科事典のため kernel(SVM)/sample(統計)等の技術語義を既に含み、一般側分布が汚染されて senseShiftC が過小評価される。日常英語(SUBTLEX思想)を代表する OpenSubtitles が「読者が誤読する側の語義」に合致 |
| B 学術一般 | **arXiv全分野 abstract のランダムサンプル、ただし cs.RO / cs.LG は除外** | Kaggle arXiv | abstract=CC0 | **CをBに包含させない**(包含すると A-vs-B と A-vs-C のkeynessが相関しL1b弁別が壊れる)。規模不足なら S2ORC(ODC-BY 1.0)へ拡張。COCA-Academic は再配布不可のため除外 |
| C 分野 | **Kaggle arXiv dataset** の cs.RO + cs.LG | [Kaggle](https://www.kaggle.com/datasets/Cornell-University/arxiv)(週次更新) | metadata(abstract含む)= **CC0** | cs.LG単独で年4.6万件級。abstractで数千万トークン規模。全文が要るなら増強パス2 |

- **コーパスサイズ非対称への対処**: A(OpenSubtitles)とCで規模が桁違いになるため、文脈分布はスムージング付き確率に正規化し、必要なら sub-sampling でトークン数オーダーを揃える。
- **cs.RO+cs.LG を束ねる可否の検証(ビルド時に1回)**: 主要候補語について cs.RO-vs-cs.LG 間JSDを測り、**中央値が A-vs-C 間JSD中央値の50%未満なら束ねてよい**(暫定基準)。超える場合は束ねると分野内分散がノイズ化するため発注者に相談。
- サイズ試算: 候補語 数千〜1万 × (スコア数個 + top-10共起語×2) ≒ 1語数百バイト → **総計 数百KB〜1MB**。上限5MB・目標1MB以下に収まる。

## 6. 評価設計

### 6-1. 正解セットの形式(これが決まり次第、発注者が20語を記入)

YAML配列(`eval/goldset.yaml`)。**`expected_signal` が切り分けレポートの肝**。

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
- **注意(§7-B)**: 学術レジスタ型の語義ズレ語(significant=有意, control=対照群)は Phase 2 では検出機構がないため**正解セットに混ぜない**(混ぜると再現率が機構外要因で汚れる)。
- **負例セットも同形式で別ファイル**(`eval/negatives.yaml`、`expected_level: not_L3`)を15〜30語。**話題語(robot, controller, trajectory 等)を必ず含める**(§1.1 の分離性能を直接測るため)。ほか matrix / algorithm(技術語だが語義がズレない)、the / of(機能語)。

### 6-2. 評価ゲート(再現率 AND 適合率)

| 指標 | 定義 | 目標 |
|---|---|---|
| 再現率 | 正解L3 20語中、L3判定できた数 / 20 | **≥70%(≥14語)** |
| 適合率 | システムのL3判定スコア上位50語を手動採点した precision@50 | **≥60%(暫定)** |
| 話題語混入率 | 上位50語中の話題語(語義不変の分野頻出語)の割合 | 計測必須(目標はPoC後に設定) |

- 再現率だけでは偽陽性の氾濫(予習時間の破綻・危険語信号の希釈)を検出できないため、**ゲートは再現率と適合率の両方**。
- 閾値の決め方: スコア分布の形状(肘・分位点)で先に決定し、正解セットは検証専用に隔離(20語への過適合=リークを防ぐ)。負例セットで適合率の暴走を監視。

### 6-3. 取りこぼし切り分けレポート(必須要件)

取りこぼした各語について「どの段で落ちたか」を排他的に特定する診断テーブルを評価スクリプトが自動生成する:

| 落ちた段 | 意味 | 改善アクション |
|---|---|---|
| 1. 候補プールミス | aFreq閾値で弾かれ横軸判定に未到達 | 縦軸の境界を緩める |
| 2. 横軸-頻度信号ミス | プール入りしたが keynessC が閾値下 | θk / コーパスC規模 |
| 3. 横軸-語義信号ミス | プール入りしたが senseShiftC or replaceGen が閾値下 | 共起窓・K・λ・θr / コーパス拡張(増強パス1-2) |
| 4. 話題語ガード誤爆 | 語義置換型なのに話題語疑いバケットに落ちた | θr の調整(replaceGen の感度) |

出力例:

| 語 | expected_signal | aFreq | プール | keynessC | senseShiftC | replaceGen | 判定 | 落ちた段 |
|---|---|---|---|---|---|---|---|---|
| sound | sense_shift | 高 | ✓ | 1.2 | 0.31(閾値下) | 0.55 | L1a | 3. 語義信号ミス |
| kernel | both | 中 | ✗ | — | — | — | 非候補 | 1. 候補プールミス |

`expected_signal` × 「落ちた段」の突合で改善アクションが一意に決まる。

### 6-4. PoC の実施順(Phase 2a 冒頭)

1. コーパス調達(A共起=OpenSubtitles、B/C=Kaggle arXiv)と前処理
2. 2信号+replaceGen を最小実装し、**senseShiftC 上位50語を目視 → 話題語混入率を最初に計測**(§1.1 の成否がここで判る)
3. 正解セット20語+負例で評価ゲート+切り分けレポートを一度出す
4. ゲート未達なら増強パス(§4)へ。**ゲート通過までUIに進まない**

## 7. 検討課題の結論

### A. 中間層コーパス(denote, admissible, bound, converge)の要否 → **まず3本で測る。第4は作らない(条件付き保留)**
- この層は学術Bに広く出るため、B-vs-C keyness では「Cで特に突出しない」= L1b に落ちるのが理論的期待。
- 検証手順: 手ラベル済みプローブ集合(15語程度)を分類に通し誤分類率を測る。誤分類率 >30% かつ誤りがこの層に体系的に集中する場合のみ「STEM一般」層を追加。

### B. L3-academic(significant=有意, control=対照群, argue/suggest)→ **Phase 2 は検出不能につき明示的に非スコープ**
- 学術レジスタ型の語義ズレは **A-vs-B の語義信号(senseShiftB)** がないと検出できない。これらの語は一般英語でも高頻度なため keynessB も持ち上がりにくく、現行機構では L1a に落ちる公算が大きい。「L1bに畳めば拾える」は成立しない(旧版の記述を撤回)。
- 判断: senseShiftB を足すと実装がほぼ倍化する一方、読者(制御系エンジニア)にとって学術レジスタは分野語義より誤読リスクが低い。**Phase 2 では対象外と正直に宣言し、正解セットにも混ぜない**(§6-1)。
- 再検討基準: Phase 2 運用で学術レジスタ型の誤読が実際に問題になったら、senseShiftB を第3信号として増強パスに追加する。

## 8. リスクと未解決点

1. **話題ズレと語義ズレの分離が効かない可能性**(§1.1): replaceGen はヒューリスティックで、有効性はPoC(§6-4-2)まで未確定。効かない場合は増強パス3(SGNS+OP)や共起の品詞制限等を検討。**本製品最大の技術リスク。**
2. **wordfreq に共起はない**(§5): 一般英語生テキスト(OpenSubtitles)の調達を Phase 2a 冒頭タスクに明示。
3. **20語での閾値過適合**: 分布ベースで閾値決定、正解セットは検証専用(§6-2)。
4. **cs.RO+cs.LG を束ねる前提は実測未検証**: §5 の暫定基準(JSD中央値50%)で1回検証する。
5. **分野軸SCDの公表精度数値は乏しい**: 70%/60% 目標は他タスク(SemEval)からの外挿。Phase 2a の実測まで確定しない。切り分けレポートが最初のイテレーションで効く設計にしてある。
6. arXiv abstract の **LaTeX・数式・引用マクロの前処理**が実地検証の成否に直結(仕様は architecture.md §3 tokenize / pipeline 前処理に記載)。
7. SGNS採用時(増強パス3)の訓練分散 → 複数シード平均 or 低次元(d=5でも高性能の報告あり)。
