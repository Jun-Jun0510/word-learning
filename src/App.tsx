/**
 * Phase 2b UI(phase2b_ui_review.md 修正1〜3・5反映)。
 * - デフォルト表示: 語 / この分野での意味(英語・短く) / 出現文スニペット
 * - タップで開く: 一般的な意味(日本語) / この分野での意味(日本語)。開閉はログに記録
 *   (ステータスは自動変更しない)。訳を見る前に思い出す一拍を作る
 * - 共起語・⚑はデバッグ設定でのみ表示
 * - L3・L2 とも上限20グループ+もっと見る。解析ごとに展開状態をリセット
 */
import { useEffect, useRef, useState } from 'react'
import { analyze, snippet, type AnalysisResult } from './core/analyze'
import { groupByStem, type WordGroup } from './core/group'
import * as WB from './store/wordbook'
import type { VocabTable, DocWord } from './core/types'

const GROUP_CAP = 20  // 上限はグループ単位でカウント(発見3・承認済み)

const statusStyle: Record<WB.Status, string> = {
  new: 'bg-red-100 text-red-700',
  learning: 'bg-yellow-100 text-yellow-700',
  known: 'bg-green-100 text-green-700',
}

/** スニペット内の対象語を太字化 */
function Sentence({ text, word }: { text: string; word: string }) {
  const snip = snippet(text, word)
  const re = new RegExp(`\\b(${word.slice(0, Math.max(4, word.length - 2))}[a-z'-]*)`, 'i')
  const m = snip.match(re)
  if (!m || m.index === undefined) return <span className="italic">“{snip}”</span>
  return (
    <span className="italic">
      “{snip.slice(0, m.index)}<strong className="not-italic font-bold">{m[1]}</strong>{snip.slice(m.index + m[1].length)}”
    </span>
  )
}

function SurfaceBlock({ w, wb, debug, onCycle, onOpen }: {
  w: DocWord; wb: WB.Wordbook; debug: boolean
  onCycle: (key: string, sid: string) => void; onOpen: (key: string) => void
}) {
  const [open, setOpen] = useState(false)
  const e = w.entry
  const senses = e.senses?.length ? e.senses : [{ id: `${w.entryKey}#default`, domainSense: '' }]
  const toggle = () => { if (!open) onOpen(w.entryKey); setOpen(!open) }
  return (
    <div>
      <button className="w-full text-left" onClick={toggle}>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-semibold text-lg">{w.entryKey}</span>
          {debug && e.pinned && <span className="text-xs text-purple-500">pin</span>}
          {debug && e.topicRisk && <span title="自動判定の確信度低">⚑</span>}
          <span className="text-xs text-gray-400 ml-auto">×{w.count}</span>
          {senses.map(s => {
            const st = wb.words[w.entryKey]?.senses[s.id]?.status ?? 'new'
            return (
              <span key={s.id} role="button" tabIndex={0}
                className={`px-2 py-0.5 rounded text-xs cursor-pointer ${statusStyle[st]}`}
                onClick={ev => { ev.stopPropagation(); onCycle(w.entryKey, s.id) }}
              >{st}</span>
            )
          })}
        </div>
        {/* デフォルト表示: この分野での意味(英語・短く) */}
        {senses[0].domainSense
          ? <p className="text-sm text-gray-800">{senses.map(s => s.domainSense).filter(Boolean).join(' / ')}</p>
          : <p className="text-sm text-gray-300">(語義説明は未生成)</p>}
        {/* デフォルト表示: 出現文スニペット */}
        <p className="text-sm text-gray-500"><Sentence text={w.sentence} word={w.entryKey} /></p>
      </button>
      {open && (
        <div className="mt-1 pl-2 border-l-2 border-blue-200 text-sm space-y-1">
          {senses.map(s => (
            <div key={s.id}>
              {(s.jaGeneral || s.ja)
                ? <p><span className="text-gray-400">一般:</span> {s.jaGeneral ?? '—'} <span className="text-gray-400 ml-2">分野:</span> {s.ja ?? '—'}</p>
                : <p className="text-gray-300">(日本語訳は未生成)</p>}
            </div>
          ))}
          {debug && e.collGeneral && (
            <p className="text-xs text-gray-400">一般の隣人: {e.collGeneral.slice(0, 5).join(', ')} / この分野の隣人: {(e.collField ?? []).slice(0, 5).join(', ')}</p>
          )}
        </div>
      )}
    </div>
  )
}

function GroupRow(props: { g: WordGroup; wb: WB.Wordbook; debug: boolean; onCycle: (k: string, s: string) => void; onOpen: (k: string) => void }) {
  const { g, ...rest } = props
  return (
    <li className="border-b border-gray-200 py-2">
      <SurfaceBlock w={g.rep} {...rest} />
      {g.variants.map(v => (
        <div key={v.entryKey} className="mt-1 pl-3 border-l-2 border-gray-100">
          <SurfaceBlock w={v} {...rest} />
        </div>
      ))}
    </li>
  )
}

function CappedList({ title, groups, wb, debug, onCycle, onOpen }: {
  title: string; groups: WordGroup[]; wb: WB.Wordbook; debug: boolean
  onCycle: (k: string, s: string) => void; onOpen: (k: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? groups : groups.slice(0, GROUP_CAP)
  return (
    <section className="mt-5">
      <h2 className="text-xl font-bold">
        {title} <span className="text-sm font-normal text-gray-400">
          {groups.length}グループ{groups.length > GROUP_CAP && !expanded ? `(上位${GROUP_CAP}を表示中)` : ''}
        </span>
      </h2>
      <ul>{shown.map(g => <GroupRow key={g.rep.entryKey} g={g} wb={wb} debug={debug} onCycle={onCycle} onOpen={onOpen} />)}</ul>
      {groups.length > GROUP_CAP && !expanded && (
        <button className="mt-2 text-sm text-blue-600" onClick={() => setExpanded(true)}>
          もっと見る(残り {groups.length - GROUP_CAP} グループ)
        </button>
      )}
    </section>
  )
}

function Prestudy({ result, wb, debug, onCycle, onOpen }: {
  result: AnalysisResult; wb: WB.Wordbook; debug: boolean
  onCycle: (k: string, s: string) => void; onOpen: (k: string) => void
}) {
  const visible = (w: DocWord) => WB.aggregateStatus(wb.words[w.entryKey]) !== 'known'
  const l3groups = groupByStem(result.l3.filter(visible))
  const l2groups = groupByStem(result.l2.filter(visible))
  return (
    <>
      <CappedList title="L3 危険語" groups={l3groups} wb={wb} debug={debug} onCycle={onCycle} onOpen={onOpen} />
      <CappedList title="L2 専門語" groups={l2groups} wb={wb} debug={debug} onCycle={onCycle} onOpen={onOpen} />
    </>
  )
}

/**
 * 読了後チェック(requirements §5.6 最小版): 文書のL3語を○/×で1タップ自己採点。
 * 予習中に日本語訳を開いた語を優先的に先頭へ(architecture §7.2 の連携)。
 * 主指標「正答率80%」の計測装置。
 */
function PostReadCheck({ wb, onCheck }: { wb: WB.Wordbook; onCheck: (docId: string, key: string, correct: boolean) => void }) {
  const docs = Object.entries(wb.docs).sort((a, b) => b[1].addedAt.localeCompare(a[1].addedAt))
  const [docId, setDocId] = useState(docs[0]?.[0] ?? '')
  if (!docs.length) return <p className="mt-4 text-sm text-gray-400">まだ文書がありません。予習タブで解析してください。</p>
  const opened = new Set(wb.docs[docId]?.opened ?? [])
  const words = Object.entries(wb.words)
    .filter(([, st]) => st.level === 'L3' && st.sources.some(s => s.docId === docId))
    .sort((a, b) => (opened.has(b[0]) ? 1 : 0) - (opened.has(a[0]) ? 1 : 0))
  const stats = WB.checkStats(wb, docId)
  const mark = (key: string) => Object.values(wb.words[key]?.senses ?? {})[0]?.selfCheck?.find(c => c.docId === docId)
  return (
    <section className="mt-4">
      <select className="border rounded p-1 text-sm w-full" value={docId} onChange={e => setDocId(e.target.value)}>
        {docs.map(([id, d]) => <option key={id} value={id}>{d.title}({d.addedAt})</option>)}
      </select>
      <p className="text-sm mt-2">
        読中に「正しい分野固有の意味」で解釈できていたか? —
        採点 {stats.checked}/{words.length} 語
        {stats.checked > 0 && <> / 正答率 <strong>{Math.round((100 * stats.correct) / stats.checked)}%</strong>(目標80%)</>}
      </p>
      <ul className="mt-2">
        {words.map(([k, st]) => {
          const m = mark(k)
          const sense = Object.keys(st.senses)[0]
          return (
            <li key={k} className={`border-b border-gray-100 py-2 flex items-center gap-2 ${m ? 'opacity-60' : ''}`}>
              <span className="font-semibold">{k}</span>
              {opened.has(k) && <span className="text-xs text-orange-500" title="予習で訳を開いた語">開</span>}
              <span className="ml-auto flex gap-1">
                <button className={`px-3 py-1 rounded border ${m?.correct === true ? 'bg-green-600 text-white' : ''}`}
                  onClick={() => onCheck(docId, k, true)}>○</button>
                <button className={`px-3 py-1 rounded border ${m?.correct === false ? 'bg-red-600 text-white' : ''}`}
                  onClick={() => onCheck(docId, k, false)}>×</button>
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function WordbookView({ wb, onCycle }: { wb: WB.Wordbook; onCycle: (key: string, sid: string) => void }) {
  const [levelF, setLevelF] = useState<string>('all')
  const [statusF, setStatusF] = useState<string>('all')
  const rows = Object.entries(wb.words)
    .filter(([, st]) => levelF === 'all' || st.level === levelF)
    .filter(([, st]) => statusF === 'all' || WB.aggregateStatus(st) === statusF)
    .sort((a, b) => b[1].updatedAt.localeCompare(a[1].updatedAt))
  return (
    <section className="mt-4">
      <div className="flex gap-2 text-xs mb-2 flex-wrap">
        {['all', 'L3', 'L2', 'L1b'].map(l => (
          <button key={l} className={`px-2 py-1 rounded border ${levelF === l ? 'bg-blue-600 text-white' : ''}`} onClick={() => setLevelF(l)}>{l}</button>
        ))}
        {['all', 'new', 'learning', 'known'].map(s => (
          <button key={s} className={`px-2 py-1 rounded border ${statusF === s ? 'bg-blue-600 text-white' : ''}`} onClick={() => setStatusF(s)}>{s}</button>
        ))}
      </div>
      <p className="text-xs text-gray-400 mb-2">{rows.length}語 / 文書{Object.keys(wb.docs).length}件</p>
      {levelF === 'L1b' && (
        <p className="text-xs text-orange-500 mb-2">
          注: L1b(論文英語層)は現状判定精度が低く、一般語や既知語が混入します(定義見直し待ち。architecture.md §7.3)
        </p>
      )}
      <ul>
        {rows.map(([k, st]) => (
          <li key={k} className="border-b border-gray-100 py-2">
            <div className="flex items-baseline gap-2">
              <span className="font-semibold">{k}</span>
              <span className="text-xs text-gray-400">{st.level}</span>
              <span className="text-xs text-gray-400 ml-auto">出典{st.sources.length}件</span>
            </div>
            {Object.entries(st.senses).map(([sid, ss]) => (
              <button key={sid} className={`mr-1 mt-1 px-2 py-0.5 rounded text-xs ${statusStyle[ss.status]}`} onClick={() => onCycle(k, sid)}>
                {sid.includes('#default') ? ss.status : `${sid.split('#')[1]}: ${ss.status}`}
              </button>
            ))}
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function App() {
  const [table, setTable] = useState<VocabTable | null>(null)
  const [text, setText] = useState('')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [docId, setDocId] = useState('')
  const [debug, setDebug] = useState(false)
  const [tab, setTab] = useState<'prestudy' | 'wordbook' | 'check'>('prestudy')
  const [wb, setWb] = useState<WB.Wordbook>(() => WB.load())
  const [saveError, setSaveError] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/vocab_table.json`)
      .then(r => r.json()).then(setTable).catch(() => setTable(null))
  }, [])

  const persist = (next: WB.Wordbook) => {
    setWb({ ...next })
    if (!WB.save(next)) setSaveError(true)
  }
  const onCycle = (key: string, sid: string) => persist(WB.cycle(wb, key, sid))
  const onOpen = (key: string) => persist(WB.logOpen(wb, docId, key))

  const run = () => {
    if (!table) return
    const r = analyze(text, table)
    const id = WB.docIdOf(text)
    setResult(r)
    setDocId(id)
    const title = text.trim().split('\n')[0].slice(0, 50)
    // 保存は L3/L2/L1b の3層(L1b は予習に出さないが長期資産として単語帳に貯める。
    // 表示上の判断と保存を混ぜない — 2本目所感のバグ修正)
    persist(WB.record(wb, id, title, [...r.l3, ...r.l2, ...r.l1b].map(w => ({
      entryKey: w.entryKey, entry: w.entry, count: w.count, sentence: w.sentence,
    }))))
  }

  const doExport = () => {
    const blob = new Blob([WB.exportJson(wb)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `word-learning-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
  }
  const doImport = (file: File) => {
    file.text().then(t => {
      try { persist(WB.importMerge(wb, JSON.parse(t))); alert('マージしました') }
      catch (e) { alert('インポート失敗: ' + e) }
    })
  }

  return (
    <main className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold">word-learning</h1>
      <p className="text-sm text-gray-500 mb-3">読む前に貼る。危険語(L3)を10〜15分で予習する。 {table?.domain ?? '読み込み中…'}</p>
      {saveError && (
        <p className="text-sm text-red-600 mb-2">保存に失敗しました(容量超過の可能性)。エクスポートでバックアップしてください。</p>
      )}
      <div className="flex gap-2 mb-3">
        <button className={`px-3 py-1 rounded ${tab === 'prestudy' ? 'bg-blue-600 text-white' : 'border'}`} onClick={() => setTab('prestudy')}>予習</button>
        <button className={`px-3 py-1 rounded ${tab === 'wordbook' ? 'bg-blue-600 text-white' : 'border'}`} onClick={() => setTab('wordbook')}>単語帳</button>
        <button className={`px-3 py-1 rounded ${tab === 'check' ? 'bg-blue-600 text-white' : 'border'}`} onClick={() => setTab('check')}>読了後チェック</button>
        <span className="ml-auto flex gap-2 items-center">
          <button className="text-xs border rounded px-2 py-1" onClick={doExport}>エクスポート</button>
          <button className="text-xs border rounded px-2 py-1" onClick={() => fileRef.current?.click()}>インポート</button>
          <input ref={fileRef} type="file" accept=".json" className="hidden"
            onChange={e => e.target.files?.[0] && doImport(e.target.files[0])} />
        </span>
      </div>
      {tab === 'prestudy' && (
        <>
          <textarea className="w-full h-40 border rounded p-2 text-sm"
            placeholder="論文の abstract / 本文テキストをここに貼り付け"
            value={text} onChange={e => setText(e.target.value)} />
          <div className="flex items-center gap-4 mt-2">
            <button className="bg-blue-600 text-white rounded px-4 py-2 disabled:opacity-40"
              disabled={!table || !text.trim()} onClick={run}>解析する</button>
            <label className="text-xs text-gray-400 flex items-center gap-1">
              <input type="checkbox" checked={debug} onChange={e => setDebug(e.target.checked)} />
              デバッグ表示(共起語・⚑)
            </label>
          </div>
          {result && (
            <>
              <p className="text-xs text-gray-400 mt-3">
                {result.totalTokens.toLocaleString()} tokens / 非収載率 {(result.unmatchedRatio * 100).toFixed(1)}%(機能語・一般語含む)
              </p>
              {/* key=docId で解析ごとに展開状態をリセット(修正5) */}
              <div key={docId}>
                <Prestudy result={result} wb={wb} debug={debug} onCycle={onCycle} onOpen={onOpen} />
              </div>
            </>
          )}
        </>
      )}
      {tab === 'wordbook' && <WordbookView wb={wb} onCycle={onCycle} />}
      {tab === 'check' && <PostReadCheck wb={wb} onCheck={(d, k, c) => persist(WB.recordCheck(wb, d, k, c))} />}
    </main>
  )
}
