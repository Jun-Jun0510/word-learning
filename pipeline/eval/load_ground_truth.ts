/**
 * ground_truth.yaml のローダー+スキーマ検証。
 * 発注者指示: 実装より先に評価スクリプトが読み込めることを確認する。
 * 評価スクリプト(evaluate.ts)はこのローダー経由でのみ正解セットを読む。
 *
 * ground_truth.yaml は凍結ファイル。本ローダーは読み取り専用で、
 * 内容の書き換え・自動修正は行わない。
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as yaml from 'js-yaml'

// 将来 'L3-academic' を追加できる拡張可能な形(phase1_approval.md)
export const KNOWN_LEVELS = ['L3', 'L2', 'L1b', 'L1a', 'not_L3'] as const
export const SIGNALS = ['sense_shift', 'both', 'frequency_shift', 'topic_only', 'none'] as const
export type Signal = (typeof SIGNALS)[number]

export interface GoldEntry {
  word: string
  expected_level: string
  expected_signal: Signal
  general_sense?: string
  field_sense?: string
  notes?: string
}

export interface GroundTruth {
  positives: GoldEntry[]
  negatives: GoldEntry[]
  /** 読者既知のため評価対象外(false positive としても数えない)の語 */
  readerKnown: string[]
}

// ground_truth.yaml ヘッダコメントと同期させること
const READER_KNOWN = ['plant', 'gain', 'observer', 'regular', 'horizon', 'state']

export function loadGroundTruth(file?: string): GroundTruth {
  const here = path.dirname(fileURLToPath(import.meta.url))
  const p = file ?? path.join(here, 'ground_truth.yaml')
  const doc = yaml.load(fs.readFileSync(p, 'utf8')) as { positives?: unknown; negatives?: unknown }

  const errors: string[] = []
  const seen = new Set<string>()

  function validate(list: unknown, group: 'positives' | 'negatives'): GoldEntry[] {
    if (!Array.isArray(list)) { errors.push(`${group}: 配列でない`); return [] }
    return list.map((e: any, i: number) => {
      const at = `${group}[${i}]${e?.word ? ` (${e.word})` : ''}`
      if (!e?.word || typeof e.word !== 'string') errors.push(`${at}: word がない`)
      if (!e?.expected_level) errors.push(`${at}: expected_level がない`)
      if (!SIGNALS.includes(e?.expected_signal)) errors.push(`${at}: expected_signal が不正: ${e?.expected_signal}`)
      if (group === 'positives' && !['sense_shift', 'both', 'frequency_shift'].includes(e?.expected_signal))
        errors.push(`${at}: positives に負例用 signal (${e?.expected_signal})`)
      if (group === 'negatives' && !['topic_only', 'none'].includes(e?.expected_signal))
        errors.push(`${at}: negatives に正例用 signal (${e?.expected_signal})`)
      if (group === 'negatives' && e?.expected_level !== 'not_L3') errors.push(`${at}: 負例は expected_level: not_L3`)
      if (e?.word) {
        if (seen.has(e.word)) errors.push(`${at}: 重複語`)
        seen.add(e.word)
        if (e.word !== e.word.toLowerCase().trim()) errors.push(`${at}: word は小文字・trim 済みであること`)
        if (READER_KNOWN.includes(e.word)) errors.push(`${at}: 読者既知語がセットに混入`)
      }
      return e as GoldEntry
    })
  }

  const positives = validate(doc?.positives, 'positives')
  const negatives = validate(doc?.negatives, 'negatives')
  if (errors.length > 0) throw new Error('ground_truth.yaml スキーマ違反:\n  ' + errors.join('\n  '))
  return { positives, negatives, readerKnown: READER_KNOWN }
}

// 直接実行時: パース確認と群別サマリ
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const gt = loadGroundTruth()
  const by = (list: GoldEntry[], s: Signal) => list.filter(e => e.expected_signal === s).length
  console.log('parse OK')
  console.log(`positives: ${gt.positives.length}  (sense_shift: ${by(gt.positives, 'sense_shift')}, both: ${by(gt.positives, 'both')}, frequency_shift: ${by(gt.positives, 'frequency_shift')})`)
  console.log(`negatives: ${gt.negatives.length}  (topic_only: ${by(gt.negatives, 'topic_only')}, none: ${by(gt.negatives, 'none')})`)
  console.log(`reader-known (評価対象外): ${gt.readerKnown.join(', ')}`)
}
