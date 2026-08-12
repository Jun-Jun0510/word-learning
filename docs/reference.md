# reference — リポジトリ内文書の案内

最終更新: 2026-08-13
このファイルは「どの文書に何が書いてあるか」の案内。文書を追加・大幅更新したらここも更新する。

## ルート

| ファイル | 内容 | 状態 |
|---|---|---|
| `README.md` | プロジェクト概要、レベル定義の要約、ドキュメント一覧 | 済 |
| `project_brief.txt` | プロジェクトブリーフ(要件の原本。役割・中核仮説・フェーズ・制約) | 原本(変更しない) |

## docs/

| ファイル | 内容 | フェーズ | 状態 |
|---|---|---|---|
| `docs/phase0_answers.md` | Phase 0 質問10個への発注者回答の**原文**。追加補足(二軸モデル、コーパス3本、L1a検証、モード分離、単語帳仕様)を含む。要件と齟齬があればこちらが正 | 0 | 済 |
| `docs/requirements.md` | 要件定義。ユーザーストーリー / レベル定義(二軸) / 機能・非機能要件 / スコープ・非スコープ / 成功指標 / リスク | 0 | 済 |
| `docs/research_competitors.md` | 競合調査(requirements-agent)。Readlang/LingQ/Anki/Yomitan/DeepL+語彙プロファイラ系9ツール。結論: L3の切り口は空白地帯、最大リスクはL3検出精度 | 0 | 済 |
| `docs/architecture.md` | 設計。ビルド時/実行時の分離、データフロー(Mermaid)、モジュール分割、vocab_table・単語帳DBのデータ設計、技術選定理由、リスク、Phase 2 実装順 | 1 | 済 |
| `docs/algorithm.md` | L3判定アルゴリズム(単独切り出し)。SCDの分野軸転用、手法比較(log-odds+Dirichlet / 文脈分布JSD 採用、BERT不採用)、話題語ガード(replaceGen)、分類ロジック、コーパス調達とライセンス、評価設計(正解セットYAML形式・再現率+適合率ゲート・取りこぼし切り分け)、PoC実施順 | 1 | 済(レビュー反映済み) |
| `docs/review_phase1.md` | reviewer-agent による Phase 1 批判レビューの指摘21件と対応の記録 | 1 | 済 |
| `docs/phase1_approval.md` | Phase 1 承認の**原文**。話題語ガードの条件a/b、L3-academic のレベル拡張性、L3表示上限20語と削り方、負例2種、2a完了報告物。Phase 2a 実装条件の一次ソース | 1 | 済 |
| `docs/summary_phase2a_poc.md` | Phase 2a PoC 中間報告(統括)。ゲート数値、設計変更5イテレーションの経緯(delta・rgRel・談話標識ガード)、必須添付3点、設計プローブ(prior/mass)報告、残課題 ※再現率は検証セット値(汎化性能ではない。phase2a_review.md の訂正参照) | 2a | 済 |
| `docs/phase2a_review.md` | Phase 2a レビューの**原文**。検証セット/汎化の訂正、判断3件(話題語混入許容+⚑フラグ、Cコーパス構成先行、語義スキーマ即決)、held-out 10語の運用 | 2a | 済 |
| `docs/proposal_c_corpus.md` | Cコーパス構成の提案(承認待ち)。推奨=R60/L40・音響除外。収集方法(日付スライス)と before/after 検証計画 | 2a→2b | **承認待ち** |
| `docs/proposal_sense_schema.md` | 語義単位スキーマの提案(承認待ち)。検出は語単位・ステータスは語義単位・未整備語はデフォルト語義。マイグレーション含む | 2a→2b | **承認待ち** |
| `docs/setup_frontend.md` | フロントエンド選定理由と初期セットアップ手順(Q10) | 2b | 未着手(Phase 2b で作成) |

## pipeline/(コード・データ)

| パス | 内容 |
|---|---|
| `pipeline/fetch/` | コーパス取得(arXiv API ハーベスタ、OpenSubtitles ストリーミング) |
| `pipeline/compute/build.ts` | 判定エンジン本体(頻度・keyness・共起JSD・delta・rgRel・分類)。実装の正 |
| `pipeline/eval/ground_truth.yaml` | ★凍結★ 正解セット(20正例+8負例) |
| `pipeline/eval/evaluate.ts` | 評価(群別再現率・4段切り分け・precision@50リスト生成) |
| `pipeline/out/eval_report.md` | 最新の評価レポート(診断表全文) |
| `public/data/vocab_table.json` | 配信用語彙表(ビルド産物) |

## 運用メモ

- 統括まとめ文書は `summary_*` 命名とする(該当文書が生まれた時点で作成)
- セッション再開用ブリーフィングは `ForNext_Report.md`(セッション終了時に作成/更新)
