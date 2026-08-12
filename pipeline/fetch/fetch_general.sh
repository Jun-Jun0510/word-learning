#!/usr/bin/env bash
# 一般英語(日常英語)の共起用生テキスト: OpenSubtitles (OPUS v2018, en, mono)
# algorithm.md §5: Wikipedia は技術語義混入のため不採用。OpenSubtitles を第一候補とする。
# 全量(数GB)は不要なので、ストリーミングで先頭 CAP_BYTES だけ取り出す。
# ライセンス: OPUS 経由の OpenSubtitles。配布するのは集計値のみ(生テキストはコミットしない)。
set -uo pipefail

URL="https://object.pouta.csc.fi/OPUS-OpenSubtitles/v2018/mono/en.txt.gz"
OUT="corpus/A_opensubtitles.txt"
CAP_BYTES=${CAP_BYTES:-209715200}   # 200MB 生テキスト ≒ 3,500万トークン

mkdir -p corpus
if [ -s "$OUT" ]; then
  echo "already exists: $OUT ($(wc -c < "$OUT") bytes) — delete to re-fetch"
  exit 0
fi

echo "streaming $URL -> $OUT (first $CAP_BYTES bytes of decompressed text)"
# head がパイプを閉じた時点で curl は終了する(全量DLしない)。
# gzip の途中打ち切りエラーは想定内なので無視する。
curl -sL "$URL" | gzip -dc 2>/dev/null | head -c "$CAP_BYTES" > "$OUT" || true

BYTES=$(wc -c < "$OUT")
echo "wrote $BYTES bytes"
if [ "$BYTES" -lt 1000000 ]; then
  echo "ERROR: output too small — URL or network problem" >&2
  exit 1
fi
