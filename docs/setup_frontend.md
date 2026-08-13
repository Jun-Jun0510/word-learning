# setup_frontend — フロントエンド選定理由と初期セットアップ手順(Q10)

最終更新: 2026-08-13(Phase 2b 着手時)

## 選定理由(architecture.md §5 の要約+実際の構成)

| 採用 | 理由 |
|---|---|
| React 19 + TypeScript | 情報量最多で詰まりにくい。vocab_table / 単語帳のスキーマを型で固定し pipeline と共有 |
| Vite 7 | dev 起動が速く、`base` 設定だけで GitHub Pages に静的ビルドを置ける |
| Tailwind CSS 4(@tailwindcss/vite) | v4 は vite プラグインだけで動き、設定ファイル不要。モバイル対応をユーティリティで最短実装 |
| 状態管理なし | useState のみ(発注者指示) |

## セットアップ手順(このリポジトリで実施済みの内容。再現用)

```bash
# 1. 依存(pipeline 用 package.json に追加)
npm i react react-dom
npm i -D vite @vitejs/plugin-react tailwindcss @tailwindcss/vite @types/react @types/react-dom

# 2. 設定ファイル
#   vite.config.ts … plugins: [react(), tailwindcss()], base: '/word-learning/'
#   index.html     … ルート直下。<div id="root"> + /src/main.tsx
#   src/index.css  … @import "tailwindcss"; の1行
#   tsconfig.json  … moduleResolution: bundler, jsx: react-jsx, include: [src, pipeline]

# 3. 実行
npm run dev      # 開発サーバ
npm run build    # dist/ に静的ビルド(vocab_table.json は public/data/ から同梱される)
npm run preview  # ビルド確認
```

## 構成の要点

- **前処理・トークナイズは pipeline と同一実装を共有**: `src/core/analyze.ts` が `pipeline/compute/text.ts` を直接 import(architecture.md §3.1 の「同じ実装を共有」を物理的に保証)
- レンマ化は wink-lemmatizer の名詞レンマ(pipeline と同一)をブラウザ内で実行
- vocab_table.json は `public/data/` に置き、`fetch(BASE_URL + 'data/vocab_table.json')` でロード
- L3 表示上限 20 語(`L3_DISPLAY_CAP` 定数。ハードコード禁止要件に従いパラメータ化)
- ⚑(topicRisk)はデフォルト非表示、チェックボックスで表示(phase2a_close_approval.md)

## サイズ記録(2026-08-13 発注者判断)

vocab_table.json = **生値 3.1MB / gzip 1.03MB**(語義7,437語焼き込み後)。上限5MB以内・目標1MB(生値)超過だが、gzip実測で実用上問題なしとして現状のまま進めることを承認済み。遅延ロード分割(日本語のみ別チャンク)は複雑さが増えるため不採用 — 実地検証で遅いと感じたら戻る。

## 既知のTODO(2b 内)

1. **バンドル 1.9MB(gzip 669KB)**: wink-lemmatizer の辞書が主因。ビルド時にレンマ表(変化形→見出し語)を vocab_table.json に焼き込み、実行時 wink を除去する(architecture.md 当初案に戻す)
2. 未照合率の定義を「レンマ表未ヒット」に厳密化(現状は L1a 含む非収載率)
3. 語幹グルーピング表示(architecture.md §7.2)/ 単語帳・2モード・JSON I/O は 2b 後続
