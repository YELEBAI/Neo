import { create } from 'zustand'
import { chatRepository, messageRepository } from '@/db/repositories'
import type { Chat, Message, CreateChatInput, CreateMessageInput } from '@neo-tavern/shared'

interface ChatState {
  chats: Chat[]
  currentChat: Chat | null
  messages: Message[]
  loading: boolean
  sending: boolean
  error: string | null

  loadChats: () => Promise<void>
  loadChat: (id: string) => Promise<void>
  createOrGetChat: (input: CreateChatInput) => Promise<Chat>
  deleteChat: (id: string) => Promise<void>
  loadMessages: (chatId: string) => Promise<void>
  addMessage: (input: CreateMessageInput) => Promise<Message>
  updateMessage: (id: string, content: string) => Promise<void>
  deleteMessage: (id: string) => Promise<void>
  clearError: () => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  currentChat: null,
  messages: [],
  loading: false,
  sending: false,
  error: null,

  loadChats: async () => {
    set({ loading: true, error: null })
    try {
      const chats = await chatRepository.list()
      set({ chats, loading: false })
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
    }
  },

  loadChat: async (id: string) => {
    set({ loading: true, error: null })
    try {
      const chat = await chatRepository.getById(id)
      if (chat) {
        const messages = await messageRepository.listByChatId(chat.id)
        set({ currentChat: chat, messages, loading: false })
      } else {
        set({ loading: false })
      }
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
    }
  },

  createOrGetChat: async (input: CreateChatInput) => {
    set({ loading: true, error: null })
    try {
      const inMemory = get().chats.find((c) => c.characterId === input.characterId)
      if (inMemory) {
        const messages = await messageRepository.listByChatId(inMemory.id)
        set({ currentChat: inMemory, messages, loading: false })
        return inMemory
      }
      const existing = await chatRepository.getByCharacterId(input.characterId)
      if (existing.length > 0) {
        const chat = existing[0]
        const messages = await messageRepository.listByChatId(chat.id)
        const state = get()
        set({ currentChat: chat, messages, chats: state.chats, loading: false })
        return chat
      }
      const chat = await chatRepository.create(input)
      set((state) => ({
        chats: [chat, ...state.chats],
        currentChat: chat,
        messages: [],
        loading: false,
      }))
      return chat
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
      throw err
    }
  },

  deleteChat: async (id: string) => {
    set({ loading: true, error: null })
    try {
      await chatRepository.delete(id)
      await messageRepository.deleteByChatId(id)
      set((state) => ({
        chats: state.chats.filter((c) => c.id !== id),
        currentChat: state.currentChat?.id === id ? null : state.currentChat,
        messages: state.currentChat?.id === id ? [] : state.messages,
        loading: false,
      }))
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
      throw err
    }
  },

  loadMessages: async (chatId: string) => {
    try {
      const messages = await messageRepository.listByChatId(chatId)
      set({ messages })
    } catch (err) {
      set({ error: (err as Error).message })
    }
  },

  addMessage: async (input: CreateMessageInput) => {
    try {
      const message = await messageRepository.create(input)
      set((state) => ({
        messages: [...state.messages, message],
      }))
      return message
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  },

  clearError: () => set({ error: null }),

  updateMessage: async (id: string, content: string) => {
    try {
      const updated = await messageRepository.update(id, content)
      set((state) => ({
        messages: state.messages.map((m) => (m.id === id ? updated : m)),
      }))
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  },

  deleteMessage: async (id: string) => {
    try {
      await messageRepository.deleteMessage(id)
      set((state) => ({
        messages: state.messages.filter((m) => m.id !== id),
      }))
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  },
}))
