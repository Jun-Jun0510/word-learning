/**
 * 語幹グルーピング(表示層のみ。architecture.md §7.2、発見3)。
 * - 抽出・状態は表層形のまま。表示だけグループ化し、上限20語はグループ単位でカウント
 * - 保守的な接辞セットで語幹を導出し、同一語幹の語が「同じ文書のリスト内に共に存在する」
 *   場合のみグループ化する(辞書的に無関係な語を誤ってまとめない)
 * - 代表語 = グループ内で表示順位(rank)最大の語
 */
import type { DocWord } from './types'

const SUFFIXES = ['ations', 'ation', 'ions', 'ion', 'ings', 'ing', 'ies', 'ed', 'es', 'ate', 's', 'e']

function stemOf(w: string): string {
  for (const suf of SUFFIXES) {
    if (w.length - suf.length >= 4 && w.endsWith(suf)) return w.slice(0, w.length - suf.length)
  }
  return w
}

export interface WordGroup {
  rep: DocWord
  variants: DocWord[]   // rep を除く同語幹の変化形(表示順位順)
}

/** rows は表示順位でソート済みであること。順序を保ったままグループ化する */
export function groupByStem(rows: DocWord[]): WordGroup[] {
  const byStem = new Map<string, WordGroup>()
  const order: WordGroup[] = []
  for (const w of rows) {
    const stem = stemOf(w.entryKey)
    const g = byStem.get(stem)
    if (g) { g.variants.push(w) }
    else {
      const ng = { rep: w, variants: [] as DocWord[] }
      byStem.set(stem, ng)
      order.push(ng)
    }
  }
  return order
}
