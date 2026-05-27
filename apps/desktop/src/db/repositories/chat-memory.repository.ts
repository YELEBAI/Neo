import { getStorageItem, removeStorageItem, setStorageItem } from '../storage'

const STORAGE_KEY = 'neotavern_chat_memories'

export interface ChatMemory {
  chatId: string
  summary: string
  sourceHash: string
  sourceMessageCount: number
  updatedAt: string
}

async function loadAll(): Promise<ChatMemory[]> {
  try {
    const raw = await getStorageItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

async function saveAll(memories: ChatMemory[]) {
  await setStorageItem(STORAGE_KEY, JSON.stringify(memories))
}

export const chatMemoryRepository = {
  async get(chatId: string): Promise<ChatMemory | null> {
    return (await loadAll()).find((memory) => memory.chatId === chatId) ?? null
  },

  async upsert(input: Omit<ChatMemory, 'updatedAt'>): Promise<ChatMemory> {
    const memory: ChatMemory = {
      ...input,
      updatedAt: new Date().toISOString(),
    }
    const all = await loadAll()
    await saveAll([
      ...all.filter((candidate) => candidate.chatId !== input.chatId),
      memory,
    ])
    return memory
  },

  async delete(chatId: string): Promise<void> {
    await saveAll((await loadAll()).filter((memory) => memory.chatId !== chatId))
  },

  async clearAll(): Promise<void> {
    await removeStorageItem(STORAGE_KEY)
  },
}
