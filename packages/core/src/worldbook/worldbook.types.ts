export interface WorldbookEntry {
  id: string
  title: string
  keys: string[]
  content: string
  priority: number
  enabled: boolean
  insertionPosition: 'beforeRecentMessages' | 'afterCharacter' | 'beforeUserInput'
}

export interface Worldbook {
  id: string
  name: string
  entries: WorldbookEntry[]
}
