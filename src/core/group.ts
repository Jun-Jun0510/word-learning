/**
 * 語幹グルーピング(表示層のみ。architecture.md §7.2、発見3)。
 * - 抽出・状態は表層形のまま。表示だけグループ化し、上限はグループ単位でカウント
 * - 各語から保守的な接辞剥がしで「語幹候補集合」を作り、候補が交差する語同士のみグループ化。
 *   silent-e 復元(navigat→navigate)と二重子音の縮約(plann→plan)を候補に含めることで
 *   agile/agility, robust/robustness, planner/planning が繋がる(phase2b_ui_review.md 修正6)
 * - 代表語 = グループ内で表示順位(rank)最大の語(rows が順位順である前提で先勝ち)
 */
import type { DocWord } from './types'

const SUFFIXES = [
  'ations', 'ation', 'ilities', 'ility', 'ities', 'ity', 'ments', 'ment', 'ness',
  'ings', 'ing', 'ions', 'ion', 'ies', 'ers', 'er', 'ed', 'es', 'ate', 'al', 's', 'e',
]

function candidatesOf(w: string): Set<string> {
  const set = new Set([w])
  for (const suf of SUFFIXES) {
    if (w.endsWith(suf) && w.length - suf.length >= 4) {
      const base = w.slice(0, w.length - suf.length)
      set.add(base)
      set.add(base + 'e')                                   // navigat → navigate
      if (/([b-df-hj-np-tv-z])\1$/.test(base)) set.add(base.slice(0, -1))  // plann → plan
    }
  }
  return set
}

export interface WordGroup {
  rep: DocWord
  variants: DocWord[]   // rep を除く同語幹の変化形(表示順位順)
}

/** rows は表示順位でソート済みであること。順序を保ったままグループ化する */
export function groupByStem(rows: DocWord[]): WordGroup[] {
  const owner = new Map<string, WordGroup>()   // 語幹候補 → グループ
  const order: WordGroup[] = []
  for (const w of rows) {
    const cands = candidatesOf(w.entryKey)
    let g: WordGroup | undefined
    for (const c of cands) { if (owner.has(c)) { g = owner.get(c); break } }
    if (g) g.variants.push(w)
    else {
      g = { rep: w, variants: [] }
      order.push(g)
    }
    for (const c of cands) if (!owner.has(c)) owner.set(c, g)
  }
  return order
}
