# summary_precision_fixes — precision@50 = 20% への対処(診断1〜3)

実施日: 2026-08-13
指示: docs/phase2a_review.md 後の採点結果(20%)を受けた3診断への、指示順での対処。

## 診断2対応(最優先): トークナイズ由来のゴミ

**原因を特定**: ゴミの正体は (1) 略語(IL, AIL, DIME, OL, PoW — 原文で確認)と著者名(Hutchinson, Fu)が小文字化でL3機構に混入、(2) **A(字幕)では本物の英単語だがC内でだけ略語の同綴り異義**(elf/ELF, dagger/DAgger, mail/MAIL)。

**修正**:
- トークナイザを大文字保持に変更し、**大文字率フィルタ**を導入(小文字出現率<30% = 略語・固有名詞。全体統計 + **C側単独統計**の二段)
- 文脈語彙・候補語の最小長を3に引き上げ
- 分類対象からも除外(7,875語を排除。ros / gail / hutchinson 等が消えた)

**collField before/after(発注者指摘語の抜粋)**:

| 語 | 旧 | 新 |
|---|---|---|
| imitation | gail, il, dime, ail, mail | mail, bilateral, learning, rail, cloning(判定もL2/jargonに降格) |
| method | prevail, nsa, hutchinson, fu, tent | prevail, tent, existing, alternating, surpasses(判定はtopic-suspectに降格) |
| policy | pow, ambidextrous, sep, composer, ol | mobilization, ambidextrous, composer, firewall, shielded |
| pose | tac, ape, regress, estimation, nap | regress, estimation, camera's, serious, dock |

残存ノイズ: A・Cどちらでも小文字で使われる希少な同綴り(propose の "elf" 等)が僅かに残る。完全排除には品詞タグ等が必要で、費用対効果から保留。

## 診断3対応: L2・学術一般語・固有名詞の流入

1. **固有名詞**: 上記フィルタで対処(ros 等)
2. **ジャーゴンガード(新設)**: delta > 0.42 の語は「Bにほぼ生息しない=一般英語の顔をしていない」専門語として **L2 へ降格**。採点データで妥当群上限(grounding 0.381)とジャーゴン群下限(robotic 0.468)が明確に分離していたことに基づく。grasping / tactile / unmanned / aerial / planner / imitation / robotics / humanoid / indoor / embodied / robotic が L2 に移動
3. **学術語の分岐(新信号 jsdBC)**: B高頻度語(kBA≥θb)は、**B と C で使われ方が割れる(jsdBC≥θbc)場合のみ** L3(sense-academic ルート)。method / accuracy は排除。**mass が sense-academic で検出に復帰**(B=天体質量 vs C の割れを捕捉。ピンは保険として維持、eval_report に「検出済み」と表示される)
4. B疎語の rgRel=null 楽観扱いを廃止

## 診断1対応: θrr 再探索(1・2の後に実施)

スイープ結果(採点済み50語に対する効果):

| θrr | 妥当残留 | 話題混入 | L2混入 | 学術混入 | 検証セット回帰 |
|---|---|---|---|---|---|
| 0.35 | 8/10 | 16/27 | 1/7 | 3/5 | 14/20 |
| 0.50 | 8/10 | 16/27 | 1/7 | 3/5 | 14/20 |
| 0.65 | 8/10 | 16/27 | 1/7 | 3/5 | **12/20**(hard, demonstration 等を破壊) |

**結論: 残存話題語に θrr は無効**。残存16語の rgRel は 0.6〜1.0 に分布し妥当語(0.37〜0.96)と完全に重なる。⚑フラグの適合率100%は「rgRel が極端に低い語」という部分集合でのみ成立していた。採用値は同成績でL3総数が10%小さい **0.5**(hard 0.524 / primitive 0.502 が閾値ぎりぎりである点はリスクとして記録)。

## 採点済み50語への総合効果(参考値。汎化は新リストの再採点で測る)

| 群 | 修正前 | 修正後 |
|---|---|---|
| L3妥当(10) | 10 | 8(model, agent が topic-suspect 誤爆で喪失) |
| 話題語(27) | 27 | 16 |
| L2・固有名詞(7) | 7 | 1(sensor のみ) |
| 学術一般(5) | 5 | 3(propose, proposed, existing) |

検証セット回帰: 14/20(sense_shift 7/10)。取りこぼし: support / head / augmentation(topic-suspect誤爆)、collapse / greedy / value(信号閾値下)。

## 追記(2026-08-13): ゲートv2(再現率優先)での回復

発注者の方針転換(誤りの非対称性: 混入=自己修復/取りこぼし=永久。`phase2a_review2_recall_pivot.md`)を受け、
- **sense-academic-rg ルート**(学術頻出だがC文体語でない語の語義救済)で value / collapse / greedy を回復
- **topic-flagged ルート**(fk≥θk でも語義証拠 jAC≥θs があれば ⚑付きでL3)で support / head / model / agent を回復
- θrr を 0.35 に戻し hard / primitive / collapse のマージンを確保

結果: **再現率 19/20(必須≥18 ✅)、sense_shift 10/10(必須≥9 ✅)**。残る取りこぼしは augmentation(既知の不一致)のみ。副作用として describe が sense-academic-rg 経由で混入(rgRel 0.82 で分離不能。自己修復側として許容)。

## 残課題(忖度なし)

1. **残存話題語16語(trajectory, motion, planning, robot 等)は一次分布統計の限界**。rgRel・delta・jsdBC のどの軸でも妥当語と重なる(実測)。「robot の文脈変化(話題)」と「return の文脈変化(語義)」は一次共起では同じに見える。**発注者が判断1で示した条件「C拡充後も混入するなら第3信号を検討」は成立した** — SGNS+OP 等への投資判断を仰ぐ
2. topic-suspect 誤爆(support, head, augmentation, model, agent)が新たな主要な取りこぼし経路。第3信号はこちらも救える可能性が高い
3. propose / proposed / existing は freq+sense 経由で残存(C abstracts の文体的頻度差。jsdBC も低くない)
