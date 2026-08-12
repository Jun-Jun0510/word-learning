/**
 * Phase 2a 評価スクリプト(algorithm.md §6)。
 * middata.json(build.ts の産物)と ground_truth.yaml を突合し、
 *   - 再現率: 全体 / sense_shift群(独立指標) / both群
 *   - 負例: 話題語型・一般語型を分けて報告(混ぜない。発注者指示)
 *   - 取りこぼしの4段切り分け
 *   - precision@50 手動採点用リスト(読者既知語は除外)
 * を pipeline/out/eval_report.md に出力する。
 */
import * as fs from 'node:fs'
import { loadGroundTruth, type GoldEntry } from './load_ground_truth.ts'

const mid = JSON.parse(fs.readFileSync('pipeline/out/middata.json', 'utf8'))
const gt = loadGroundTruth()
const byWord = new Map<string, any>(mid.rows.map((r: any) => [r.word, r]))
const { θd, θd2, θs, θk } = mid.thresholds
const θr = mid.builtWith.thetaRR

type Diag = {
  word: string; signal: string; found: string; bucket: string
  zipf: number | null; fieldKey: number | null; jsdAC: number | null; jsdAB: number | null; delta: number | null
  rg: number | null
  hit: boolean; stage: string
}

function diagnose(e: GoldEntry): Diag {
  const r = byWord.get(e.word)
  const base = {
    word: e.word, signal: e.expected_signal,
    zipf: r?.zipf ?? null, fieldKey: r?.fieldKey ?? null,
    jsdAC: r?.jsdAC ?? null, jsdAB: r?.jsdAB ?? null, delta: r?.delta ?? null, rg: r?.rgRel ?? null,
  }
  if (!r) return { ...base, found: '(データなし)', bucket: '-', hit: false, stage: '1. 候補プールミス(語が統計母数に入らず)' }
  const hit = r.level === 'L3'
  if (hit) return { ...base, found: r.level, bucket: r.bucket, hit: true, stage: '-' }
  let stage: string
  if (r.zipf < mid.builtWith.highFreqZipf) stage = '1. 候補プールミス(aFreq閾値未満で高頻度プール外)'
  else if (r.bucket === 'topic-suspect') stage = '4. 話題語ガード誤爆'
  else if (r.jsdAC === null) stage = '3. 横軸-語義信号ミス(共起不足で信号計算不能)'
  else {
    const rgRelOk = r.rgRel === null || r.rgRel === undefined ? true : r.rgRel >= θr
    const fails: string[] = []
    if (!(r.delta !== null && r.delta >= θd && rgRelOk)) fails.push('delta系不成立')
    if (!(r.jsdAC >= θs && rgRelOk)) fails.push('sense-replace不成立')
    if (!(r.fieldKey >= θk)) fails.push('fieldKey<θk')
    const senseFail = fails.includes('delta系不成立') && fails.includes('sense-replace不成立')
    const freqFail = fails.includes('fieldKey<θk')
    if (senseFail && freqFail) stage = e.expected_signal === 'sense_shift' ? `3. 横軸-語義信号ミス(${fails.join(', ')})` : `2+3. 両信号ミス(${fails.join(', ')})`
    else if (senseFail) stage = `3. 横軸-語義信号ミス(${fails.join(', ')})`
    else stage = '2. 横軸-頻度信号ミス'
  }
  return { ...base, found: r.level, bucket: r.bucket, hit: false, stage }
}

const pos = gt.positives.map(diagnose)
const senseGroup = pos.filter(d => d.signal === 'sense_shift')
const bothGroup = pos.filter(d => d.signal === 'both')
const negTopic = gt.negatives.filter(e => e.expected_signal === 'topic_only').map(e => ({ e, r: byWord.get(e.word) }))
const negGeneral = gt.negatives.filter(e => e.expected_signal === 'none').map(e => ({ e, r: byWord.get(e.word) }))

const recall = (g: Diag[]) => g.filter(d => d.hit).length
const pct = (n: number, d: number) => `${((100 * n) / d).toFixed(0)}%`

// precision@50 手動採点用(読者既知語は除外して数えない)
const known = new Set(gt.readerKnown)
const top50 = mid.rows
  .filter((r: any) => r.level === 'L3' && !known.has(r.word))
  .sort((a: any, b: any) => b.score - a.score)
  .slice(0, 50)

const fmt = (v: number | null, digits = 2) => (v === null || v === undefined ? '—' : (+v).toFixed(digits))
const diagTable = (g: Diag[]) => [
  '| 語 | signal | 判定 | bucket | zipf | fieldKey | jsdAC | jsdAB | delta | rg | 結果 | 落ちた段 |',
  '|---|---|---|---|---|---|---|---|---|---|---|---|',
  ...g.map(d => `| ${d.word} | ${d.signal} | ${d.found} | ${d.bucket} | ${fmt(d.zipf, 1)} | ${fmt(d.fieldKey)} | ${fmt(d.jsdAC, 4)} | ${fmt(d.jsdAB, 4)} | ${fmt(d.delta, 4)} | ${fmt(d.rg, 3)} | ${d.hit ? '✓' : '✗'} | ${d.stage} |`),
].join('\n')

const negLine = (x: { e: GoldEntry; r: any }) =>
  `| ${x.e.word} | ${x.r?.level ?? '(なし)'} | ${x.r?.bucket ?? '-'} | ${fmt(x.r?.fieldKey)} | ${fmt(x.r?.jsdAC, 4)} | ${fmt(x.r?.jsdAB, 4)} | ${fmt(x.r?.delta, 4)} | ${fmt(x.r?.rgRel, 3)} | ${x.r?.level === 'L3' ? '✗ 混入' : '✓'} |`

const report = `# Phase 2a 評価レポート

生成: build thresholds θd=${θd.toFixed(4)} θd2=${θd2.toFixed(4)} θk(fieldKey)=${θk.toFixed(2)}
コーパス tokens: A=${mid.tokens.A.toLocaleString()} B=${mid.tokens.B.toLocaleString()} C=${mid.tokens.C.toLocaleString()}

## ゲート数値

| 指標 | 値 | 目標 | 判定 |
|---|---|---|---|
| 再現率(全体) | ${recall(pos)}/20 (${pct(recall(pos), 20)}) | ≥70% | ${recall(pos) >= 14 ? '✅' : '❌'} |
| **再現率(sense_shift群)** | ${recall(senseGroup)}/10 (${pct(recall(senseGroup), 10)}) | <30%ならJSD設計やり直し | ${recall(senseGroup) >= 3 ? '✅(下限クリア)' : '❌ JSD設計要見直し'} |
| 再現率(both群) | ${recall(bothGroup)}/10 (${pct(recall(bothGroup), 10)}) | (参考) | - |
| 話題語型負例のL3混入 | ${negTopic.filter(x => x.r?.level === 'L3').length}/5 | 0 | ${negTopic.every(x => x.r?.level !== 'L3') ? '✅' : '❌ 話題語ガード失敗'} |
| 一般語型負例のL3混入 | ${negGeneral.filter(x => x.r?.level === 'L3').length}/3 | 0 | ${negGeneral.every(x => x.r?.level !== 'L3') ? '✅' : '❌ 候補プール入口失敗'} |
| precision@50 | 手動採点待ち(下表) | ≥60% | ⏳ |

## positives 診断 — sense_shift 群(JSD設計の唯一の指標)

${diagTable(senseGroup)}

## positives 診断 — both 群

${diagTable(bothGroup)}

## negatives — 話題語型(ガードの検証)

| 語 | 判定 | bucket | fieldKey | jsdAC | jsdAB | delta | rg | 結果 |
|---|---|---|---|---|---|---|---|---|
${negTopic.map(negLine).join('\n')}

## negatives — 一般語型(候補プール入口の検証)

| 語 | 判定 | bucket | fieldKey | jsdAC | jsdAB | delta | rg | 結果 |
|---|---|---|---|---|---|---|---|---|
${negGeneral.map(negLine).join('\n')}

## precision@50 手動採点用リスト(L3判定 score上位50、読者既知語除外)

| # | 語 | score | bucket | collGeneral | collField |
|---|---|---|---|---|---|
${top50.map((r: any, i: number) => `| ${i + 1} | ${r.word} | ${r.score} | ${r.bucket} | ${(r.collGeneral ?? []).slice(0, 5).join(', ')} | ${(r.collField ?? []).slice(0, 5).join(', ')} |`).join('\n')}
`

fs.writeFileSync('pipeline/out/eval_report.md', report)
console.log(report.split('\n').slice(0, 20).join('\n'))
console.log('\nfull report: pipeline/out/eval_report.md')
