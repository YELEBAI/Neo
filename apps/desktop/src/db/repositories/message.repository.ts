import { generateId } from '@neo-tavern/shared'
import type { Message, CreateMessageInput } from '@neo-tavern/shared'

const STORAGE_KEY = 'neotavern_messages'

function loadAll(): Message[] {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : [] } catch { return [] }
}
function saveAll(msgs: Message[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs)) } catch {}
}

export const messageRepository = {
  async listByChatId(chatId: string): Promise<Message[]> {
    return loadAll().filter((m) => m.chatId === chatId).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  },

  async create(input: CreateMessageInput): Promise<Message> {
    const msg: Message = { id: generateId(), chatId: input.chatId, role: input.role, content: input.content, createdAt: new Date().toISOString() }
    const all = loadAll()
    all.push(msg)
    saveAll(all)
    return msg
  },

  async deleteByChatId(chatId: string): Promise<void> {
    saveAll(loadAll().filter((m) => m.chatId !== chatId))
  },

  async update(id: string, content: string): Promise<Message> {
    const all = loadAll()
    const idx = all.findIndex((m) => m.id === id)
    if (idx === -1) throw new Error(`Message not found: ${id}`)
    all[idx].content = content
    saveAll(all)
    return all[idx]
  },

  async deleteMessage(id: string): Promise<void> {
    saveAll(loadAll().filter((m) => m.id !== id))
  },
}
