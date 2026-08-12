# Phase 1 レビュー記録 — reviewer-agent 指摘と対応

実施日: 2026-08-13
対象: `docs/requirements.md` / `docs/architecture.md` / `docs/algorithm.md`
指摘総数: 21件(高9・中7・低5)。phase0_answers.md の指示項目自体の反映漏れはゼロで、問題は正しさ・内部整合・スコープにあった。

## 対応表

| # | 重大度 | 指摘(要約) | 対応 |
|---|---|---|---|
| 1 | 高 | 共起JSDは語義ズレだけでなく「話題ズレ」(robot, controller等)も拾い、L3が話題語で汚染される。分離機構がない | **反映**: 語義置換指標 `replaceGen`(一般側共起語がCで消えたか)を新設し分類条件に組込み。PoC最初の計測項目を「話題語混入率」に。負例セットに話題語を必須化(algorithm §1.1, §3, §6) |
| 2 | 高 | 「PPMI化してJSD」は数理的に不整合(PPMIは確率分布でない)。文脈語彙の整列も未定義 | **反映**: 「条件付き文脈分布 P(c\|w) + 共通サポート(A∩C上位K語)+ add-λ平滑化 → JSD」に統一。PPMI+コサインは代替として注記(algorithm §3) |
| 3 | 高 | B(arXiv全分野)がC(cs.RO+cs.LG)を包含し keyness が汚染 | **反映**: B = arXiv全分野から cs.RO/cs.LG を**除外**したサンプルに再定義(algorithm §5, architecture 図) |
| 4 | 高 | A共起源にWikipediaは不適(技術語義を含み一般側が汚染され senseShiftC が過小評価) | **反映**: OpenSubtitles を第一候補に確定、Wikipedia不採用と理由を明記(algorithm §5, architecture 図) |
| 5 | 高 | 単一パスOR条件下で「復活パス」は同一閾値ゆえ発火せず空回り。文面が誤解を招く | **反映**: 復活はOR条件に内包されると明記。実体は「全スコア保持+debug_l1a目視+閾値調整で再ビルド」の運用。別途θ_reviveは過剰設計として置かない(algorithm §3) |
| 6 | 高 | Phase 2スコープが個人開発に対し過大 | **反映**: 2a(エンジン+評価ゲート)/ 2b(最小UI)/ 2c(蓄積・保全)に分割。2aゲート通過までUIに進まない(requirements §8, architecture §8) |
| 7 | 高 | 読了後チェックをPhase 3送り可としたのは phase0 の明示指示と主指標の計測可能性に矛盾 | **反映**: 最小版(○/×1タップ)を Phase 2c に含めると確定(requirements §5.6, §8, architecture §7) |
| 8 | 高 | 「L3-academicをL1bに畳む」は検出機構(senseShiftB)がなく機構的に破綻 | **反映**: 旧記述を撤回し「Phase 2 は検出不能につき明示的に非スコープ。正解セットにも混ぜない。問題化したら senseShiftB を増強パスで追加」に書き直し(algorithm §7-B, §6-1) |
| 9 | 高 | 適合率に目標値がなく評価ゲートが再現率のみで空転。L3リスト長上限もない | **反映**: precision@50 ≥60%(暫定)を追加しゲートを「再現率AND適合率」に。予習モードL3表示は危険度上位30語上限(algorithm §6-2, requirements §5.4, §9) |
| 10 | 中 | arXiv abstractのLaTeX/数式/引用の前処理方針が未定義 | **反映**: 前処理仕様を新設、pipelineと実行時で実装共有(architecture §3.1) |
| 11 | 中 | 危険度順ソートの統合スコア合成が未定義 | **反映**: score = max(percentile(senseShiftC×replaceGen), percentile(keynessC)) を定義(algorithm §3) |
| 12 | 中 | トークナイズ具体方針(ユニグラム/大文字小文字/ハイフン語)未記載 | **反映**: ユニグラムのみ・小文字化・ハイフン語は1トークン→分割再照合、を明記(architecture §3.1) |
| 13 | 中 | iOS Safari ITP(7日無操作でlocalStorage消去)が未考慮 | **反映**: リスク表+定期エクスポート促し+将来PWA化(architecture §4.2, §7) |
| 14 | 中 | レンマ化器が未特定、照合漏れの計測法がない | **反映**: wink-lemmatizer を明記、レンマ表未ヒット率のログ出力を設計に追加(architecture §3.1) |
| 15 | 中 | JSONインポートの意味(マージ/置換)とdocId重複排除が未定義 | **反映**: インポート=マージ(sources和集合・statusは進んだ方)、docId=内容ハッシュで再貼付を同一視(architecture §4.2) |
| 16 | 中 | 分類ロジックのL1b条件の二重記載、低aFreq側の網羅性の穴 | **反映**: 分類ブロックを書き直し。低aFreq残余の扱いと「低aFreqではsenseShiftCを判定に使わない」を明記(algorithm §3) |
| 17 | 低 | JSD参考URLの実在性が疑わしい | **反映**: 当該URLを削除 |
| 18 | 低 | cs.RO+cs.LGを束ねる可否の判断基準がない | **反映**: 暫定基準「サブコーパス間JSD中央値 < A-vs-C中央値の50%なら束ねる」を設定(algorithm §5) |
| 19 | 低 | 英米綴りの正規化方針がない | **反映**: レンマ表に英米綴り正規化を含める(architecture §3.1) |
| 20 | 低 | 読了後チェックをPhase 3送りにしつつselfCheckスキーマを積むのは投機的 | **反映**: #7 で読了後チェックをPhase 2cに残したため、スキーマは整合(現状維持) |
| 21 | 低 | 「静的手法がそのまま正解」はSemEval-EN限定の結論の一般化しすぎ | **反映**: 「本製品の制約下では type-based が実務上の最適」に限定表現へ修正(algorithm §1) |

## 発注者に判断を仰ぐ点(Phase 1 レビュー時)

1. **話題語ガードの副作用**: keynessC 単独で高い語(頻度急増だが語義条件を満たさない語)は自動でL3にせず「話題語疑い」として保留にした。phase0 のL3定義「Cで**分布**・語義がズレる」より狭めている。PoCの混入率実測後に扱いを確定する方針でよいか
2. **L3-academic の完全非スコープ化**(#8): significant/control 等は Phase 2 では検出されない。正解セットに混ぜない前提でよいか
3. **予習モードL3上限30語**・**precision@50≥60%** の暫定値
