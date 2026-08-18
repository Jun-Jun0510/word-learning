# word-learning

英語の論文・技術記事を「翻訳せずに読む」ための、事前単語学習アプリ。

読む前に PDF / URL / テキストを読み込ませ、その文書に出てくる単語を「一般的な難易度」ではなく **その読者にとっての危険度** でレベル分けして提示し、10〜15分で予習できる状態にする。

## 単語レベルの定義(中核仮説)

| レベル | 定義 | 優先度 |
|---|---|---|
| L1 一般語 | 一般英語コーパスでも高頻度 | 除外 |
| L2 明白な専門語 | 見た目で専門語と分かる (eigenvalue, holonomic 等) | 中 |
| L3 危険語 | 見た目は日常語だが、その分野で特殊な意味を持つ語 (kernel, regular, tight, plant, gain 等) | **最優先** |
| L4 略語・記号 | FOC, PMSM, MPC 等。文書内定義があれば抽出 | 中 |

L3 は読者が「知ってるつもり」で誤読する語。ここを潰すのが最大の学習効果。

## 使う

- **ブラウザだけで使う**: https://jun-jun0510.github.io/word-learning/ (main への push で自動デプロイ)
- **ローカルで動かす**: **Node.js ≥ 20.19(推奨 22)** が必要。
  ```bash
  git clone https://github.com/Jun-Jun0510/word-learning.git
  cd word-learning
  npm install
  npm run dev   # http://localhost:5173/word-learning/
  ```
  判定エンジンの成果物(`public/data/vocab_table.json`、約3MB)はコミット済みのため、コーパスの取得や再ビルドは不要。判定を再構築する場合のみ pipeline/(コーパス取得 約40分+ビルド 約2分)が必要。

## 構成方針

- ブラウザ完結、GitHub Pages でデプロイ(サーバー費用ゼロ)
- スマホ対応
- まず動くものを最優先

## ドキュメント

- `project_brief.txt` — プロジェクトブリーフ(要件の原本)
- `docs/requirements.md` — 要件定義 (Phase 0)
- `docs/architecture.md` — 設計 (Phase 1)
- `docs/algorithm.md` — L3 判定アルゴリズム (Phase 1)
