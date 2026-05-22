import { generateId } from '@neo-tavern/shared'
import type { Chat, CreateChatInput, UpdateChatInput } from '@neo-tavern/shared'

const STORAGE_KEY = 'neotavern_chats'

function loadAll(): Chat[] {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : [] } catch { return [] }
}
function saveAll(chats: Chat[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(chats)) } catch {}
}

export const chatRepository = {
  async list(): Promise<Chat[]> {
    return loadAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  },

  async getById(id: string): Promise<Chat | null> {
    return loadAll().find((c) => c.id === id) ?? null
  },

  async getByCharacterId(characterId: string): Promise<Chat[]> {
    return loadAll().filter((c) => c.characterId === characterId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  },

  async create(input: CreateChatInput): Promise<Chat> {
    const now = new Date().toISOString()
    const chat: Chat = { id: generateId(), characterId: input.characterId, title: input.title, createdAt: now, updatedAt: now }
    const all = loadAll()
    all.push(chat)
    saveAll(all)
    return chat
  },

  async update(id: string, input: UpdateChatInput): Promise<Chat> {
    const all = loadAll()
    const idx = all.findIndex((c) => c.id === id)
    if (idx === -1) throw new Error(`Chat not found: ${id}`)
    if (input.title !== undefined) all[idx].title = input.title
    all[idx].updatedAt = new Date().toISOString()
    saveAll(all)
    return all[idx]
  },

  async delete(id: string): Promise<void> {
    saveAll(loadAll().filter((c) => c.id !== id))
  },
}
