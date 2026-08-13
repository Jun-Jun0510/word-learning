/**
 * 実行時解析: 貼り付けテキスト → vocab_table 照合 → レベル別リスト。
 * 前処理・トークナイズは pipeline/compute/text.ts と同一実装を共有する(architecture.md §3.1)。
 * レンマ化も pipeline と同じ wink-lemmatizer の名詞レンマ(複数形統合)。
 */
import { stripLatex, sentences, tokenizeRaw } from '../../pipeline/compute/text'
import type { VocabTable, DocWord } from './types'

/**
 * 表層形 → vocab_table キーの解決。
 * レンマ化はビルド時に焼き込んだレンマ表(変化形→見出し語)を引くだけ
 * (実行時 wink-lemmatizer は排除。バンドル削減。architecture.md §3.1)。
 * ハイフン語は1トークン照合 → 未収載なら分割して各要素で再照合(§3.1)。
 */
function resolve(table: VocabTable, surface: string): string | null {
  if (table.entries[surface]) return surface
  const viaLemmaMap = table.lemma[surface]
  if (viaLemmaMap && table.entries[viaLemmaMap]) return viaLemmaMap
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
      let keys: string[] = []
      const direct = resolve(table, surface)
      if (direct) keys = [direct]
      else if (surface.includes('-')) {
        // ハイフン語: 1トークン照合が外れたら分割して各要素で再照合(architecture.md §3.1)
        keys = surface.split('-').map(p => resolve(table, p)).filter((k): k is string => !!k)
      }
      if (keys.length === 0) continue
      matched++
      for (const key of keys) {
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
  }
  const rows = [...found.values()]
  // 順位付け層(algorithm.md §3.3。判定とは別レイヤー):
  //   表示順位 = corpusScore × tf × idf^0.5
  //   分野普遍語(policy: df高)は沈み、この論文固有の語(df低)が浮く。
  //   指数0.5は発注者判断(2026-08-13): 中df帯(trajectory/task/training —
  //   分野頻出だが全論文には出ない、1本目の予習でknownにすべき層)を表示圏内に維持するため。
  //   p=1.0だとこの帯が「もっと見る」の奥に沈み、既知語の飽和が進まない
  const rank = (w: DocWord) => {
    const idf = Math.max(Math.log(1 / Math.max(w.entry.df ?? 0.5, 1e-4)), 0.05)
    const tf = 1 + Math.log(w.count)
    return w.entry.score * tf * Math.sqrt(idf)
  }
  // 出現回数は足切りに使わない(要件 §5.2)
  const byRank = (a: DocWord, b: DocWord) => rank(b) - rank(a)
  return {
    l3: rows.filter(w => w.entry.level === 'L3').sort(byRank),
    l2: rows.filter(w => w.entry.level === 'L2').sort(byRank),
    totalTokens,
    unmatchedRatio: totalTokens ? 1 - matched / totalTokens : 0,
  }
}
