# Phase 2a ゲート判定結果(原文)

記録日: 2026-08-13
回答者: ohatajun
※ Phase 2b の実装条件(発見1〜3)の一次ソース。

---

# precision@50 採点結果 → 合格

precision@50 = 19/50 = 38%(新ゲート基準 ≥35% クリア)
再現率 19/20、sense_shift 10/10 と合わせて Phase 2a ゲート通過。

## 採点内訳
L3妥当(19): perception, feature, representation, learned, demonstration, world,
  deep, exploration, cloning, uncertainty, attention, latent, transformer,
  robust, objective, online, map, expert, prior
話題語(21): human⚑, outdoor, image, prediction, navigation, controller, trained,
  scene, pedestrian, terrain, video, tracking, learn, success⚑, camera⚑,
  obstacle, safe, navigate, module, navigating, vision
学術一般語(8): approach⚑, challenge⚑, challenging, diverse, capability,
  available, demonstrate⚑, extensive
L2・残骸(2): sim, occupancy

境界判定(記録用):
- perception / learned / uncertainty / cloning は妥当に入れたが弱い
- vision は話題語に落とした(誤読を生まないため)
- robust / controller / tracking は制御分野では語義シフトだが俺には既知。
  既知度軸で処理されるべき語であり、アルゴリズムの誤りではない

## 発見1: ⚑フラグの適合率が 100% → 30% に崩壊

⚑は10語(お前の申告は9語。数が合わないので確認しろ)。
うち実際に話題語だったのは human / success / camera の3語のみ。
残り7語のうち feature / online / map / prior の4語は L3妥当。

排除ではなく表示区別に変えたので致命傷ではないが、
4割が誤爆では表示の信号として機能しない。
現状の⚑は「話題語」ではなく別の何かを拾っている。
Phase 2b で⚑をUIに出す前に、何を拾っているのか診断しろ。
診断がつかないなら⚑の表示自体を保留にする判断もある。

## 発見2: 学術一般語が 5語 → 8語 に悪化

B拡張で delta は4割縮んだが approach / challenge / challenging / diverse /
capability / available / extensive が通っている。
話題語(21)に次ぐ第2の誤り群。
これらは自己修復側(1タップで消える)なので緊急ではないが、
B拡張の効果が期待より小さかったことは記録しろ。

## 発見3: 屈折変化形が枠を食っている(最重要)

50語中9枠が同一語幹の変化形:
  navigation / navigate / navigating(3枠)
  learn / learned(2枠)
  challenge / challenging(2枠)
  demonstration / demonstrate(2枠)

予習モードの上限20語では、この比率だと約4枠が重複で潰れる。
限られた枠の2割が無駄になる計算であり、実用上の損失が大きい。

ただし単純なレンマ化はするな。判定が割れている:
  demonstration = L3妥当 / demonstrate = 学術一般語
  learned = L3妥当 / learn = 話題語
統合すると妥当な方が消える可能性がある。

対応方針: 抽出は現状の表層形のままでよい。
表示側で同一語幹をグルーピングし、代表語1つを主表示、
変化形は折りたたむ形にしろ。代表語の選び方(スコア最大か、
出現回数最大か)は Phase 2b の設計事項とする。
architecture.md に記録し、2b で実装しろ。

## Phase 2b に進んでよい

順序:
1. heldout2.yaml でゲート判定を回せ。結果を報告しろ
2. 発見3のグルーピングを 2b の設計に含めろ
3. 発見1の⚑診断を 2b の実装前にやれ
4. 第3信号は引き続き凍結。2b 完了後に再判断する

heldout2 の結果が出るまで、アルゴリズムのパラメータを触るな。

---

(補記: ⚑は実データ上10語で発注者の指摘が正。Claude のメッセージ表記載時の数え間違い)
