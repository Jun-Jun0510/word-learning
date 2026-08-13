/**
 * 実行時解析: 貼り付けテキスト → vocab_table 照合 → レベル別リスト。
 * 前処理・トークナイズは pipeline/compute/text.ts と同一実装を共有する(architecture.md §3.1)。
 * レンマ化も pipeline と同じ wink-lemmatizer の名詞レンマ(複数形統合)。
 */
import { stripLatex, tokenizeRaw } from '../../pipeline/compute/text'
import type { VocabTable, DocWord } from './types'

/**
 * 表示用の文分割(phase2b_ui_review.md 修正2b)。
 * pipeline の sentences()(判定層。凍結中)には触れず、表示専用に精度を上げる:
 * 小数点(3.5 m/s)・略語(et al., Fig., e.g., i.e.)・単一大文字(A. Smith)で切らない。
 */
export function displaySentences(text: string): string[] {
  const marked = text
    .replace(/\b(e\.g|i\.e|et al|Fig|fig|cf|vs|etc|Eq|eq|Sec|sec|approx|resp|Dr|Prof)\./g, '$1<DOT>')
    .replace(/(\d)\.(\d)/g, '$1<DEC>$2')
    .replace(/\b([A-Z])\./g, '$1<DOT>')
  return marked
    .split(/(?<=[.!?;])\s+|\n+/)
    .map(s => s.replace(/<DOT>/g, '.').replace(/<DEC>/g, '.').trim())
    .filter(Boolean)
}

/**
 * 出現文のスニペット化(修正2d): 対象語の前後 window 語を残して中略する。
 * 対象語は **word** でマーク(UI側で強調表示)。
 */
export function snippet(sentence: string, word: string, window = 9): string {
  const tokens = sentence.split(/\s+/)
  const idx = tokens.findIndex(t => t.toLowerCase().replace(/[^a-z'-]/g, '').startsWith(word.slice(0, Math.max(4, word.length - 2))))
  if (idx < 0 || tokens.length <= window * 2 + 1) return sentence
  const lo = Math.max(0, idx - window), hi = Math.min(tokens.length, idx + window + 1)
  return (lo > 0 ? '… ' : '') + tokens.slice(lo, hi).join(' ') + (hi < tokens.length ? ' …' : '')
}

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
  /** L1b(論文英語層)。予習モードには表示しないが単語帳には保存する —
   *  「分野を問わず再利用できる長期資産」(phase0_answers.md §2)。表示上の判断と保存は別 */
  l1b: DocWord[]
  totalTokens: number
  unmatchedRatio: number   // レンマ表未ヒット率(照合漏れの計測。architecture.md §3.1)
}

export function analyze(text: string, table: VocabTable): AnalysisResult {
  const found = new Map<string, DocWord>()
  let totalTokens = 0
  let matched = 0
  for (const s of displaySentences(stripLatex(text))) {
    const raws = tokenizeRaw(s)
    for (let i = 0; i < raws.length; i++) {
      const raw = raws[i]
      totalTokens++
      const surface = raw.toLowerCase()
      // 実行時固有名詞ヒューリスティック(2026-08-13 承認・条件付き):
      // 文中(文頭以外)の大文字始まりトークンは固有名詞・手法名・ベンチマーク名の可能性が高い
      // (LIBERO-Long++ の "Long" 等)。スキップすると Transformer / Gaussian / Jacobian 等の
      // 正規の大文字専門語まで落ちるため、語の抽出・表示は残し「tf カウントから除外」のみ行う。
      // これで断片による順位の水増しを防ぐ(long 問題)。凍結対象外の実行時前処理
      const properish = i > 0 && /^[A-Z]/.test(raw)
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
        if (prev) {
          if (!properish) prev.count++   // 固有名詞的出現は tf に数えない(抽出・表示は維持)
          // 出現文の選定基準(修正2c、algorithm.md §3.4): 「最初の出現」ではなく
          // 「トークン数が最大の文」を採用(周辺情報量の安価なプロキシ)
          if (raws.length > prev.sentenceTokens) { prev.sentence = s; prev.sentenceTokens = raws.length }
        } else {
          found.set(key, {
            surface, entryKey: key, entry: table.entries[key],
            count: 1, sentence: s, sentenceTokens: raws.length,
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
    l1b: rows.filter(w => w.entry.level === 'L1b').sort(byRank),
    totalTokens,
    unmatchedRatio: totalTokens ? 1 - matched / totalTokens : 0,
  }
}
