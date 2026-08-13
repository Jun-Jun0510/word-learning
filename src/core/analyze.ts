/**
 * 実行時解析: 貼り付けテキスト → vocab_table 照合 → レベル別リスト。
 * 前処理・トークナイズは pipeline/compute/text.ts と同一実装を共有する(architecture.md §3.1)。
 * レンマ化も pipeline と同じ wink-lemmatizer の名詞レンマ(複数形統合)。
 */
import lemmatizer from 'wink-lemmatizer'
import { stripLatex, sentences, tokenizeRaw } from '../../pipeline/compute/text'
import type { VocabTable, DocWord } from './types'

const lemmaCache = new Map<string, string>()
function lemma(tok: string): string {
  let l = lemmaCache.get(tok)
  if (l === undefined) { l = lemmatizer.noun(tok); lemmaCache.set(tok, l) }
  return l
}

/** 表層形 → vocab_table キーの解決。表層→レンマ→(ハイフン語は将来分割照合) */
function resolve(table: VocabTable, surface: string): string | null {
  if (table.entries[surface]) return surface
  const viaLemmaMap = table.lemma[surface]
  if (viaLemmaMap && table.entries[viaLemmaMap]) return viaLemmaMap
  const l = lemma(surface)
  if (table.entries[l]) return l
  return null
}

export interface AnalysisResult {
  l3: DocWord[]
  l2: DocWord[]
  totalTokens: number
  unmatchedRatio: number   // レンマ表未ヒット率(照合漏れの計測。architecture.md §3.1)
}

export function analyze(text: string, table: VocabTable): AnalysisResult {
  const found = new Map<string, DocWord>()
  let totalTokens = 0
  let matched = 0
  for (const s of sentences(stripLatex(text))) {
    const raws = tokenizeRaw(s)
    for (const raw of raws) {
      totalTokens++
      const surface = raw.toLowerCase()
      const key = resolve(table, surface)
      if (!key) continue
      matched++
      const prev = found.get(key)
      if (prev) { prev.count++ }
      else {
        found.set(key, {
          surface, entryKey: key, entry: table.entries[key],
          count: 1, sentence: s.trim().slice(0, 300),
        })
      }
    }
  }
  const rows = [...found.values()]
  // 出現回数は足切りに使わない(要件 §5.2)。ソートは score 降順 → 出現回数降順
  const byScore = (a: DocWord, b: DocWord) => (b.entry.score - a.entry.score) || (b.count - a.count)
  return {
    l3: rows.filter(w => w.entry.level === 'L3').sort(byScore),
    l2: rows.filter(w => w.entry.level === 'L2').sort(byScore),
    totalTokens,
    unmatchedRatio: totalTokens ? 1 - matched / totalTokens : 0,
  }
}
