# summary_phase2a_poc — Phase 2a PoC 中間報告

実施日: 2026-08-13
状態: **評価ゲートのうち自動計測分は再現率クリア。precision@50 の手動採点待ち(発注者アクション)**
生成物: `pipeline/out/eval_report.md`(全診断表)/ `pipeline/out/debug_l1a.json` / `pipeline/out/debug_topic.json` / `public/data/vocab_table.json`(516KB)

## 1. ゲート数値(発注者指示の群別報告)

| 指標 | 値 | 目標 | 判定 |
|---|---|---|---|
| 再現率(全体) | **18/20 (90%)** | ≥70% | ✅ |
| **再現率(sense_shift群)** | **9/10 (90%)** | <30%ならJSD設計やり直し | ✅ JSD側の設計は機能 |
| 再現率(both群) | 9/10 (90%) | 参考 | ✅ |
| 一般語型負例の混入(however, increase, describe) | **0/3** | 0 | ✅ 候補プール入口は機能 |
| 話題語型負例の混入 | **3/5**(robot, controller, simulation) | 0 | ❌ 話題語ガード不完全 |
| precision@50 | — | ≥60% | ⏳ **手動採点待ち**(eval_report.md 末尾の表) |

取りこぼし2語: greedy(A側共起が疎で jsdAC=0.29 と低い)、augmentation(A に共起データなし=実質専門語。L2 として表示自体はされる)。

## 2. 実測が設計に強いた変更(5回のイテレーション)

| 版 | 内容 | 結果 |
|---|---|---|
| v1 | 当初設計: JSD(A,C) + replaceGen + keynessC(C-vs-A) | 再現率15/20だが **replaceGen が全語0.93〜1.0に飽和**(字幕→論文のジャンル差)、however/paper 等のレジスタ語が L3 上位を占拠 |
| v2 | レジスタ相殺: delta=JSD(A,C)−JSD(A,B)、fieldKey=C-vs-B | レジスタ語は減ったが **B(math/物理)が同じ語義汚染を持つ**ため mass/tight/value の真の信号まで相殺(sense_shift 3/10 に悪化) |
| v3 | sense-replace ルート(jsdAC+replaceGen)追加、談話標識ガード | 再現率18/20 に回復するが replaceGen 飽和により increase/simulation が混入 |
| v4 | **rgRel**(隣人生存率のB相対比)で replaceGen を置換 | increase/robot を排除しつつ mass/tight を保持 |
| 最終 | θrr=0.35(return 0.378 / robot 0.289 の間) | **18/20, sense_shift 9/10, 一般語負例0/3** |

採用した信号(実装: `pipeline/compute/build.ts`、設計反映: algorithm.md §3「Phase 2a PoC での改訂」):
- 語義軸: `delta = JSD(A,C) − JSD(A,B)`(レジスタ相殺)
- 頻度軸: `fieldKey = log-odds z(C-vs-B)`
- ガード: `rgRel`(A側典型隣人の生存率が B より C で落ちる度合い)+ 談話標識の閉クラス除外
- ルート: sense(delta+rgRel)/ freq+sense(fieldKey+緩delta)/ sense-replace(jsdAC+rgRel。B にも同語義がある STEM横断危険語 mass, tight 用)

## 3. 必須添付(承認条件)

### 3-1. L1a で落ちた語の上位15(delta降順。全80件は debug_l1a.json)
warehouse, year, agility, dialogue, gaze, united, docking, corrupted, competence, kg, specialist, aggressive, pushing, ar, eviction
→ **危険語の沈没なし**(kernel/sample/sound/plant/tight/dense/regular 該当なし)。kernel, sample, margin, agent, reward, episode, horizon はいずれも L3 判定 ✓

### 3-2. 話題語疑いプールの上位15(score降順。全80件は debug_topic.json)
benchmark, achieves, optimization, http, semantic, github, dataset, generalization, d, inference, latency, paradigm, however, b, segmentation
→ 意図どおりの内容(話題語・URL片・レジスタ語)。ここにも危険語の沈没なし

### 3-3. 取りこぼしの4段切り分け
eval_report.md の診断表参照。今回の2語はいずれも「3. 横軸-語義信号ミス」(greedy: A側共起疎 / augmentation: A共起ゼロで信号計算不能)。段4(ガード誤爆)・段1(プールミス)・段2(頻度信号ミス)は今回ゼロ。

## 4. 設計プローブへの報告(バグとして握り潰していない)

- **prior(品詞問題)**: 品詞タグなしのユニグラムで **検出には成功**(delta=0.045で sense ルート)。ただし表示時に「形容詞 prior(以前の)/名詞 prior(事前分布)」を書き分ける必要は残る → 語義説明データの問題として Phase 2b/2c へ
- **mass(分野内多義)**: **検出成功**(sense-replace ルート)。ただし C 内で確率質量と物理質量が混ざるため fieldKey=−29 と頻度信号は completely 死んでおり、sense-replace ルートがなければ落ちていた。語義単位の複数エントリ化は Phase 2 では不要と判断(検出には語単位で足りた)が、**表示(どちらの意味の警告を出すか)では必要になる** → 設計判断として Phase 3 検討事項に
- **副産物の発見 — sound**: L1a 落ち。ただし C 側共起は respiratory / music / acoustic であり、**cs.RO+cs.LG コーパスでは sound は実際に「音」の意味で使われている**(健全性の意味は formal methods / 制御理論寄りで、本分野コーパスにはほぼ出ない)。コーパスに忠実な結果であり、「読者の分野選定がL3集合を決める」という中核仮説の傍証でもある

## 5. 残課題(忖度なし)

1. **話題語 robot / controller / simulation の混入(3/5)**: robot は freq+sense ルート(rgRelガードなし。ガードを付けると support 等の正例2語を失う実測トレードオフ)。controller / simulation は rgRel 自体が高く出る(Bでの用例が既に学術的で、隣人生存率の基準として機能しない)。**一次分布統計の限界に達しつつある** — 増強パス3(SGNS+OP)か、C側共起語の「専門語率」等の第3信号が必要
2. **θrr=0.35 のマージンが薄い**(return 0.378 / robot 0.289)。20語の正解セットでこの閾値を確定するのは危険。閾値調整ではなく判別力の追加で解くべき
3. **L3 総数 1741 語は多い**。予習モードは文書内出現語との積集合+上位20語表示なので製品上は破綻しないが、precision@50 の採点結果次第で θs / θd の引き締めを判断
4. **C コーパスが目標の4割**(18,200 abstracts、arXiv API の offset 制限)。日付スライス取得で3倍化可能。greedy の取りこぼしは C 拡張で改善する可能性が高い

## 6. 次のアクション

1. **発注者**: `pipeline/out/eval_report.md` 末尾の precision@50 リスト(50語)の手動採点。各語に「L3妥当 / 話題語 / その他誤り」を付けてもらえれば混入率も同時に測れます
2. 採点結果を受けて: ゲート通過なら Phase 2b(最小UI)へ / 未達なら増強パス(C拡張 → 第3信号)
3. 話題語ガードの残課題の扱い(robot/controller/simulation を許容するか、第3信号に投資するか)を議論
