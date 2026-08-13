/**
 * held-out ゲート判定(Phase 2b 移行判定でのみ実行。phase2a_review.md の運用規約)。
 * heldout2.yaml は発注者が作成・凍結。本スクリプトは読み取り専用で、
 * フィールド名の揺れ(general/domain 形式)を許容してロードする。
 * 結果を見てのパラメータ変更は禁止(発注者指示: 結果報告まで凍結)。
 */
import * as fs from 'node:fs'
import * as yaml from 'js-yaml'

const doc = yaml.load(fs.readFileSync('pipeline/eval/heldout2.yaml', 'utf8'), { json: true }) as any
const mid = JSON.parse(fs.readFileSync('pipeline/out/middata.json', 'utf8'))
const by = new Map<string, any>(mid.rows.map((r: any) => [r.word, r]))

const norm = (e: any) => ({
  word: String(e.word).toLowerCase().trim(),
  signal: e.expected_signal ?? '(未指定)',
  general: e.general_sense ?? e.general ?? '',
  field: e.field_sense ?? e.domain ?? '',
})

const positives = (doc.positives ?? []).map(norm)
const negatives = (doc.negatives ?? []).map(norm)
console.log(`heldout2: positives=${positives.length} negatives=${negatives.length}`)

const line = (e: any) => {
  const r = by.get(e.word)
  const hit = r?.level === 'L3'
  const flag = r?.topicRisk ? ' ⚑' : ''
  return `| ${e.word} | ${e.signal} | ${r ? r.level + '/' + r.bucket + flag : '(データなし)'} | ${r?.zipf ?? '—'} | ${r?.fieldKey ?? '—'} | ${r?.delta ?? '—'} | ${r?.jsdBC ?? '—'} | ${r?.rgRel ?? '—'} | ${hit ? '✓' : '✗'} |`
}

const posHits = positives.filter((e: any) => by.get(e.word)?.level === 'L3')
const senseG = positives.filter((e: any) => e.signal === 'sense_shift')
const senseHits = senseG.filter((e: any) => by.get(e.word)?.level === 'L3')
const negTopic = negatives.filter((e: any) => e.signal === 'topic_only')
const negGen = negatives.filter((e: any) => e.signal === 'none')
const negLeak = (g: any[]) => g.filter((e: any) => by.get(e.word)?.level === 'L3')

const report = `# held-out ゲート判定(heldout2.yaml、初回参照)

ビルド: B拡張後(tokens A=${mid.tokens.A.toLocaleString()} B=${mid.tokens.B.toLocaleString()} C=${mid.tokens.C.toLocaleString()})
注: 本セットは一切のチューニングに未使用。これが現時点の汎化性能の最良推定。

## ゲート数値

| 指標 | 値 |
|---|---|
| 再現率(全体) | ${posHits.length}/${positives.length} (${((100 * posHits.length) / positives.length).toFixed(0)}%) |
| 再現率(sense_shift群) | ${senseHits.length}/${senseG.length} |
| 話題語型負例のL3混入 | ${negLeak(negTopic).length}/${negTopic.length}(うち⚑ ${negLeak(negTopic).filter((e: any) => by.get(e.word)?.topicRisk).length}) |
| 一般語型負例のL3混入 | ${negLeak(negGen).length}/${negGen.length} |

## positives 診断

| 語 | signal | 判定 | zipf | fieldKey | delta | jsdBC | rgRel | 結果 |
|---|---|---|---|---|---|---|---|---|
${positives.map(line).join('\n')}

## negatives 診断

| 語 | signal | 判定 | zipf | fieldKey | delta | jsdBC | rgRel | 結果 |
|---|---|---|---|---|---|---|---|---|
${negatives.map(line).join('\n')}
`
fs.writeFileSync('pipeline/out/heldout_report.md', report)
console.log(report)
