/**
 * 単語帳DB(localStorage)。スキーマは proposal_sense_schema.md(承認済み)準拠。
 * - 出現(sources / count)は語単位、status / selfCheck は語義単位
 * - 未キュレーション語は `<word>#default` の単一語義
 * - docId は正規化テキストの内容ハッシュ(再貼付を同一視)
 * - インポートはマージ(sources和集合、status はより進んだ方。new < learning < known)
 */
import type { VocabEntry } from '../core/types'

export type Status = 'new' | 'learning' | 'known'
const ORDER: Status[] = ['new', 'learning', 'known']

export interface SenseState {
  status: Status
  updatedAt: string
  /** 読了後チェックの記録(requirements §5.6。主指標の計測装置) */
  selfCheck?: Array<{ docId: string; correct: boolean; at: string }>
}
export interface WordState {
  level: string
  sources: Array<{ docId: string; title: string; count: number; sentence: string }>
  senses: Record<string, SenseState>
  updatedAt: string
}
export interface Wordbook {
  schemaVersion: 2
  words: Record<string, WordState>
  docs: Record<string, { title: string; addedAt: string; l3Count: number; opened?: string[] }>
}

const KEY = 'word-learning:wordbook'
const empty = (): Wordbook => ({ schemaVersion: 2, words: {}, docs: {} })
const now = () => new Date().toISOString().slice(0, 10)

export function load(): Wordbook {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return empty()
    const wb = JSON.parse(raw)
    return wb?.schemaVersion === 2 ? wb : empty()
  } catch { return empty() }
}

export function save(wb: Wordbook): boolean {
  try { localStorage.setItem(KEY, JSON.stringify(wb)); return true }
  catch { return false }  // QuotaExceeded 等 → 呼び出し側でエクスポートを促す
}

/** 正規化テキストの内容ハッシュ(cyrb53)。同一文書の再貼付を同一視する */
export function docIdOf(text: string): string {
  const s = text.replace(/\s+/g, ' ').trim().toLowerCase()
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0')
}

export function senseIdsOf(key: string, entry: VocabEntry): string[] {
  return entry.senses?.length ? entry.senses.map(s => s.id) : [`${key}#default`]
}

/** 解析結果を単語帳へ蓄積(重複エントリを作らない。sources は docId で同一視) */
export function record(wb: Wordbook, docId: string, title: string,
                       words: Array<{ entryKey: string; entry: VocabEntry; count: number; sentence: string }>): Wordbook {
  const d = now()
  if (!wb.docs[docId]) wb.docs[docId] = { title, addedAt: d, l3Count: words.filter(w => w.entry.level === 'L3').length }
  for (const w of words) {
    let st = wb.words[w.entryKey]
    if (!st) {
      st = { level: w.entry.level, sources: [], senses: {}, updatedAt: d }
      wb.words[w.entryKey] = st
    }
    for (const sid of senseIdsOf(w.entryKey, w.entry)) {
      if (!st.senses[sid]) st.senses[sid] = { status: 'new', updatedAt: d }
    }
    const src = st.sources.find(s => s.docId === docId)
    if (src) { src.count = Math.max(src.count, w.count) }
    else {
      st.sources.push({ docId, title: title.slice(0, 50), count: w.count, sentence: w.sentence })
      if (st.sources.length > 10) st.sources = st.sources.slice(-10)  // 上限設計(architecture §4.2)
    }
    st.updatedAt = d
  }
  return wb
}

/**
 * 開閉ログ(phase2b_ui_review.md 修正3): どの語の日本語訳を開いたかを文書単位で記録。
 * ステータスは自動変更しない(開かなかった=既知とは限らない)。
 * 読了後チェック画面が「開いた語」を優先的に確認対象へ出すための参考値。
 */
export function logOpen(wb: Wordbook, docId: string, key: string): Wordbook {
  const doc = wb.docs[docId]
  if (doc) {
    doc.opened ??= []
    if (!doc.opened.includes(key)) doc.opened.push(key)
  }
  return wb
}

export function cycle(wb: Wordbook, key: string, senseId: string): Wordbook {
  const s = wb.words[key]?.senses[senseId]
  if (s) { s.status = ORDER[(ORDER.indexOf(s.status) + 1) % 3]; s.updatedAt = now() }
  return wb
}

/** 語の集約ステータス: 全語義 known のとき known(予習モードから消える単位) */
export function aggregateStatus(st: WordState | undefined): Status {
  if (!st) return 'new'
  const ss = Object.values(st.senses).map(x => x.status)
  if (ss.length && ss.every(x => x === 'known')) return 'known'
  if (ss.some(x => x !== 'new')) return 'learning'
  return 'new'
}

/** 読了後チェックの○/×記録(語単位の操作を全語義に反映。同一docIdは上書き) */
export function recordCheck(wb: Wordbook, docId: string, key: string, correct: boolean): Wordbook {
  const st = wb.words[key]
  if (!st) return wb
  const at = now()
  for (const ss of Object.values(st.senses)) {
    ss.selfCheck = (ss.selfCheck ?? []).filter(c => c.docId !== docId)
    ss.selfCheck.push({ docId, correct, at })
  }
  st.updatedAt = at
  return wb
}

/** 文書の読了後チェック集計(主指標: L3語の自己採点正答率80%が目標) */
export function checkStats(wb: Wordbook, docId: string): { checked: number; correct: number } {
  let checked = 0, correct = 0
  for (const st of Object.values(wb.words)) {
    const c = Object.values(st.senses)[0]?.selfCheck?.find(x => x.docId === docId)
    if (c) { checked++; if (c.correct) correct++ }
  }
  return { checked, correct }
}

export function exportJson(wb: Wordbook): string { return JSON.stringify(wb, null, 1) }

/** マージ・インポート(置換ではない。復旧も複数端末もこれで成立) */
export function importMerge(wb: Wordbook, incoming: Wordbook): Wordbook {
  if (incoming?.schemaVersion !== 2) throw new Error('schemaVersion 2 のみ対応')
  for (const [id, doc] of Object.entries(incoming.docs)) if (!wb.docs[id]) wb.docs[id] = doc
  for (const [key, inc] of Object.entries(incoming.words)) {
    const cur = wb.words[key]
    if (!cur) { wb.words[key] = inc; continue }
    for (const s of inc.sources) {
      const mine = cur.sources.find(x => x.docId === s.docId)
      if (mine) mine.count = Math.max(mine.count, s.count)
      else cur.sources.push(s)
    }
    for (const [sid, ss] of Object.entries(inc.senses)) {
      const mine = cur.senses[sid]
      if (!mine || ORDER.indexOf(ss.status) > ORDER.indexOf(mine.status)) cur.senses[sid] = ss
    }
  }
  return wb
}
