/**
 * Phase 2b 骨格: テキスト貼り付け → L3/L2 リスト(単一画面)。
 * - L3 は上位20語で折りたたみ(「もっと見る」で全展開。requirements §5.4)
 * - ⚑(topicRisk)はデフォルト非表示・設定で表示(phase2a_close_approval.md)
 * - 単語帳・2モード・JSON I/O・語幹グルーピングは 2b 後続タスク
 */
import { useEffect, useState } from 'react'
import { analyze, type AnalysisResult } from './core/analyze'
import type { VocabTable, DocWord } from './core/types'

const L3_DISPLAY_CAP = 20  // 調整可能パラメータ(requirements §5.4)

function WordRow({ w, showFlag }: { w: DocWord; showFlag: boolean }) {
  const [open, setOpen] = useState(false)
  const e = w.entry
  return (
    <li className="border-b border-gray-200 py-2">
      <button className="w-full text-left" onClick={() => setOpen(!open)}>
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-lg">{w.entryKey}</span>
          {showFlag && e.topicRisk && <span title="自動判定の確信度低">⚑</span>}
          <span className="text-xs text-gray-400 ml-auto">×{w.count}</span>
        </div>
      </button>
      {open && (
        <div className="mt-1 text-sm text-gray-700 space-y-1">
          {e.collGeneral && (
            <p><span className="text-gray-400">一般の隣人:</span> {e.collGeneral.slice(0, 5).join(', ')}</p>
          )}
          {e.collField && (
            <p><span className="text-gray-400">この分野の隣人:</span> {e.collField.slice(0, 5).join(', ')}</p>
          )}
          <p className="text-gray-500 italic">“{w.sentence}”</p>
        </div>
      )}
    </li>
  )
}

function WordList({ title, words, cap, showFlag }: { title: string; words: DocWord[]; cap?: number; showFlag: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const shown = cap && !expanded ? words.slice(0, cap) : words
  return (
    <section className="mt-6">
      <h2 className="text-xl font-bold mb-1">{title} <span className="text-sm font-normal text-gray-400">{words.length}語</span></h2>
      <ul>{shown.map(w => <WordRow key={w.entryKey} w={w} showFlag={showFlag} />)}</ul>
      {cap && words.length > cap && !expanded && (
        <button className="mt-2 text-sm text-blue-600" onClick={() => setExpanded(true)}>
          もっと見る(残り {words.length - cap} 語)
        </button>
      )}
    </section>
  )
}

export default function App() {
  const [table, setTable] = useState<VocabTable | null>(null)
  const [text, setText] = useState('')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [showFlag, setShowFlag] = useState(false)  // ⚑デフォルト非表示

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/vocab_table.json`)
      .then(r => r.json()).then(setTable)
      .catch(() => setTable(null))
  }, [])

  return (
    <main className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold">word-learning</h1>
      <p className="text-sm text-gray-500 mb-4">
        読む前に貼る。危険語(L3)を10〜15分で予習する。 domain: {table?.domain ?? '読み込み中…'}
      </p>
      <textarea
        className="w-full h-40 border rounded p-2 text-sm"
        placeholder="論文の abstract / 本文テキストをここに貼り付け"
        value={text}
        onChange={e => setText(e.target.value)}
      />
      <div className="flex items-center gap-4 mt-2">
        <button
          className="bg-blue-600 text-white rounded px-4 py-2 disabled:opacity-40"
          disabled={!table || !text.trim()}
          onClick={() => table && setResult(analyze(text, table))}
        >
          解析する
        </button>
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
          <WordList title="L3 危険語" words={result.l3} cap={L3_DISPLAY_CAP} showFlag={showFlag} />
          <WordList title="L2 専門語" words={result.l2} showFlag={showFlag} />
        </>
      )}
    </main>
  )
}
