/**
 * Phase 2b: 予習モード / 単語帳モードの2モード(混ぜない。requirements §5.4)。
 * - 予習: 貼る → L3(グループ表示・上限20グループ+もっと見る)→ L2。known は表示から消える
 * - 状態は表層形×語義単位(1タップ)。表示はグループ(architecture §7.2)
 * - JSONエクスポート/インポート(マージ)。⚑はデフォルト非表示
 */
import { useEffect, useRef, useState } from 'react'
import { analyze, type AnalysisResult } from './core/analyze'
import { groupByStem, type WordGroup } from './core/group'
import * as WB from './store/wordbook'
import type { VocabTable, DocWord } from './core/types'

const L3_GROUP_CAP = 20  // 上限はグループ単位でカウント(発見3・承認済み)

const statusStyle: Record<WB.Status, string> = {
  new: 'bg-red-100 text-red-700',
  learning: 'bg-yellow-100 text-yellow-700',
  known: 'bg-green-100 text-green-700',
}

function SenseRows({ k, w, wb, onCycle }: { k: string; w: DocWord['entry']; wb: WB.Wordbook; onCycle: (key: string, sid: string) => void }) {
  const senses = w.senses?.length ? w.senses : null
  const sids = WB.senseIdsOf(k, w)
  return (
    <div className="space-y-1">
      {sids.map((sid, i) => {
        const st = wb.words[k]?.senses[sid]?.status ?? 'new'
        const sense = senses?.[i]
        return (
          <div key={sid} className="flex items-center gap-2 text-sm">
            <button
              className={`px-2 py-0.5 rounded text-xs ${statusStyle[st]}`}
              onClick={e => { e.stopPropagation(); onCycle(k, sid) }}
            >{st}</button>
            {sense ? (
              <span><span className="font-medium">{sense.ja}</span> — {sense.domainSense}
                <span className="text-gray-400"> / {sense.contrast}</span></span>
            ) : (
              <span className="text-gray-400">(語義未キュレーション)</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

function GroupRow({ g, wb, showFlag, onCycle }: { g: WordGroup; wb: WB.Wordbook; showFlag: boolean; onCycle: (key: string, sid: string) => void }) {
  const [open, setOpen] = useState(false)
  const e = g.rep.entry
  return (
    <li className="border-b border-gray-200 py-2">
      <button className="w-full text-left" onClick={() => setOpen(!open)}>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-semibold text-lg">{g.rep.entryKey}</span>
          {e.pinned && <span title="キュレーション・ピン" className="text-xs text-purple-500">pin</span>}
          {showFlag && e.topicRisk && <span title="自動判定の確信度低">⚑</span>}
          {g.variants.length > 0 && (
            <span className="text-xs text-gray-400">+{g.variants.map(v => v.entryKey).join(', ')}</span>
          )}
          <span className="text-xs text-gray-400 ml-auto">×{g.rep.count + g.variants.reduce((a, v) => a + v.count, 0)}</span>
        </div>
      </button>
      <div className="mt-1">
        <SenseRows k={g.rep.entryKey} w={e} wb={wb} onCycle={onCycle} />
        {g.variants.map(v => (
          <div key={v.entryKey} className="mt-1 pl-3 border-l-2 border-gray-100">
            <span className="text-sm font-medium">{v.entryKey}</span>
            <SenseRows k={v.entryKey} w={v.entry} wb={wb} onCycle={onCycle} />
          </div>
        ))}
      </div>
      {open && (
        <div className="mt-1 text-sm text-gray-700 space-y-1">
          {e.collGeneral && <p><span className="text-gray-400">一般の隣人:</span> {e.collGeneral.slice(0, 5).join(', ')}</p>}
          {e.collField && <p><span className="text-gray-400">この分野の隣人:</span> {e.collField.slice(0, 5).join(', ')}</p>}
          <p className="text-gray-500 italic">“{g.rep.sentence}”</p>
        </div>
      )}
    </li>
  )
}

function Prestudy({ result, wb, showFlag, onCycle }: { result: AnalysisResult; wb: WB.Wordbook; showFlag: boolean; onCycle: (key: string, sid: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  // known(全語義)を予習から除外(単語帳には残る。df は沈めるだけ / known は消す — 役割分離)
  const visible = (w: DocWord) => WB.aggregateStatus(wb.words[w.entryKey]) !== 'known'
  const l3groups = groupByStem(result.l3.filter(visible))
  const l2groups = groupByStem(result.l2.filter(visible))
  const shown = expanded ? l3groups : l3groups.slice(0, L3_GROUP_CAP)
  return (
    <>
      <section className="mt-4">
        <h2 className="text-xl font-bold">L3 危険語 <span className="text-sm font-normal text-gray-400">{l3groups.length}グループ</span></h2>
        <ul>{shown.map(g => <GroupRow key={g.rep.entryKey} g={g} wb={wb} showFlag={showFlag} onCycle={onCycle} />)}</ul>
        {l3groups.length > L3_GROUP_CAP && !expanded && (
          <button className="mt-2 text-sm text-blue-600" onClick={() => setExpanded(true)}>
            もっと見る(残り {l3groups.length - L3_GROUP_CAP} グループ)
          </button>
        )}
      </section>
      <section className="mt-6">
        <h2 className="text-xl font-bold">L2 専門語 <span className="text-sm font-normal text-gray-400">{l2groups.length}グループ</span></h2>
        <ul>{l2groups.map(g => <GroupRow key={g.rep.entryKey} g={g} wb={wb} showFlag={showFlag} onCycle={onCycle} />)}</ul>
      </section>
    </>
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
  const [showFlag, setShowFlag] = useState(false)
  const [tab, setTab] = useState<'prestudy' | 'wordbook'>('prestudy')
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

  const run = () => {
    if (!table) return
    const r = analyze(text, table)
    setResult(r)
    const docId = WB.docIdOf(text)
    const title = text.trim().split('\n')[0].slice(0, 50)
    persist(WB.record(wb, docId, title, [...r.l3, ...r.l2].map(w => ({
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
      try { persist(WB.importMerge(wb, JSON.parse(t))) ; alert('マージしました') }
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
              <input type="checkbox" checked={showFlag} onChange={e => setShowFlag(e.target.checked)} />
              ⚑を表示(実験的)
            </label>
          </div>
          {result && (
            <>
              <p className="text-xs text-gray-400 mt-3">
                {result.totalTokens.toLocaleString()} tokens / 未照合率 {(result.unmatchedRatio * 100).toFixed(1)}%
              </p>
              <Prestudy result={result} wb={wb} showFlag={showFlag} onCycle={onCycle} />
            </>
          )}
        </>
      )}
      {tab === 'wordbook' && <WordbookView wb={wb} onCycle={onCycle} />}
    </main>
  )
}
