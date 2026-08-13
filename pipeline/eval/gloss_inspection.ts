/**
 * 抜き取り検査レポート(docs/phase2b_glosses_approval.md の報告形式)。
 * 正解セット20語 + heldout 10語について、生成結果と発注者の手書き(general/domain)を
 * 並べて出力する。判断基準は「一行で刺さるか」(発注者が目視判定)。
 */
import * as fs from 'node:fs'
import * as yaml from 'js-yaml'
import { loadGroundTruth } from './load_ground_truth.ts'

const gen = (yaml.load(fs.readFileSync('data/glosses_generated.yaml', 'utf8')) as Record<string, any>) ?? {}
const curated = (yaml.load(fs.readFileSync('data/senses.yaml', 'utf8')) as Record<string, any>) ?? {}
const gt = loadGroundTruth()
const heldout = yaml.load(fs.readFileSync('pipeline/eval/heldout2.yaml', 'utf8'), { json: true }) as any

const rows: string[] = []
function addRow(word: string, ownerGeneral: string, ownerDomain: string) {
  const c = curated[word]?.senses?.[0]
  const g = c
    ? { jaGeneral: c.jaGeneral, ja: c.ja, domainSense: c.domainSense, src: '手書き' }
    : gen[word]
      ? { ...gen[word], src: '生成' }
      : null
  rows.push(`| ${word} | ${g?.jaGeneral ?? '—'} | ${g?.ja ?? '**欠落**'} | ${g?.domainSense ?? '—'} | ${g?.src ?? '—'} | ${ownerGeneral} | ${ownerDomain} |`)
}
for (const e of gt.positives) addRow(e.word, e.general_sense ?? '', e.field_sense ?? '')
for (const e of (heldout.positives ?? [])) addRow(String(e.word).toLowerCase(), e.general_sense ?? e.general ?? '', e.field_sense ?? e.domain ?? '')

const report = `# 語義生成 抜き取り検査(30語: 正解セット20 + heldout 10)

モデル: 生成ファイル(data/glosses_generated.yaml)参照。「手書き」= senses.yaml 優先分。
右2列は発注者の手書き(ground_truth / heldout2)— 生成との乖離確認用。

| 語 | 一般(日本語) | 分野(日本語) | 分野(英語) | 出所 | 【発注者】一般 | 【発注者】分野 |
|---|---|---|---|---|---|---|
${rows.join('\n')}
`
fs.writeFileSync('pipeline/out/gloss_inspection.md', report)
console.log(report)
