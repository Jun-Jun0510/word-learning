# held-out ゲート判定(heldout2.yaml、初回参照)

ビルド: B拡張後(tokens A=38,540,515 B=9,206,457 C=13,183,216)
注: 本セットは一切のチューニングに未使用。これが現時点の汎化性能の最良推定。

## ゲート数値

| 指標 | 値 |
|---|---|
| 再現率(全体) | 9/10 (90%) |
| 再現率(sense_shift群) | 5/6 |
| 話題語型負例のL3混入 | 1/3(うち⚑ 0) |
| 一般語型負例のL3混入 | 2/2 |

## positives 診断

| 語 | signal | 判定 | zipf | fieldKey | delta | jsdBC | rgRel | 結果 |
|---|---|---|---|---|---|---|---|---|
| ground | sense_shift | L3/sense-replace | 5.15 | 22.48 | 0.0253 | 0.3004 | 0.351 | ✓ |
| roll | sense_shift | L3/sense-replace | 4.75 | 6.04 | 0.024 | 0.2503 | 0.772 | ✓ |
| exploit | sense_shift | L3/sense-academic-rg | 3.83 | 5.23 | 0.0566 | 0.1895 | 0.728 | ✓ |
| ill | sense_shift | L1a/plain | 4.72 | 1.7 | — | — | — | ✗ |
| warm | sense_shift | L3/sense-replace | 4.71 | -7.04 | -0.0087 | 0.2027 | 1 | ✓ |
| anchor | sense_shift | L3/sense | 4.02 | 14.89 | 0.1605 | 0.2685 | 0.964 | ✓ |
| temperature | both | L3/sense-academic-rg | 4.64 | -35.54 | -0.0527 | 0.2583 | 0.598 | ✓ |
| current | both | L3/topic-flagged ⚑ | 5.27 | 14.98 | 0.0429 | 0.1841 | -0.247 | ✓ |
| bandwidth | both | L3/sense-academic-rg | 3.62 | -14.32 | -0.0298 | 0.2113 | 0.918 | ✓ |
| rejection | both | L3/sense-replace | 3.9 | 4.14 | 0.0805 | 0.2461 | 0.674 | ✓ |

## negatives 診断

| 語 | signal | 判定 | zipf | fieldKey | delta | jsdBC | rgRel | 結果 |
|---|---|---|---|---|---|---|---|---|
| manipulator | topic_only | L2/technical | 2.85 | 14.43 | — | — | — | ✗ |
| trajectory | topic_only | L3/sense | 3.61 | 82.86 | 0.0979 | 0.2122 | 0.745 | ✓ |
| latency | topic_only | L1a/plain | 3.31 | -2.72 | — | — | — | ✗ |
| introduce | none | L3/topic-flagged ⚑ | 4.37 | 35.11 | 0.0377 | 0.1291 | 0.556 | ✓ |
| obtain | none | L3/sense-academic | 4.4 | -32.36 | -0.0543 | 0.2633 | -0.016 | ✓ |
