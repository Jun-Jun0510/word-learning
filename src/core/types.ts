/** vocab_table.json のスキーマ(pipeline/compute/build.ts の出力と同期)。
 *  level は将来 'L3-academic' を追加できる拡張可能な形(phase1_approval.md) */
export type Level = 'L3' | 'L2' | 'L1b' | (string & {})

export interface VocabEntry {
  level: Level
  score: number
  topicRisk?: boolean
  collGeneral?: string[]
  collField?: string[]
  senses?: Array<{ id: string; domainSense: string; contrast: string; ja: string }>
}

export interface VocabTable {
  version: number
  domain: string
  entries: Record<string, VocabEntry>
  lemma: Record<string, string>
}

/** 文書解析結果の1行(表層形単位。known の状態単位も表層形 — phase2a_close_approval.md) */
export interface DocWord {
  surface: string          // 文書中の表層形(小文字)
  entryKey: string         // vocab_table のキー
  entry: VocabEntry
  count: number            // 文書内出現回数(ソート補助・表示用のみ。足切りに使わない)
  sentence: string         // 文書内の実際の出現文(最初の1つ)
}
