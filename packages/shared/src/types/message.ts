export type MessageRole = 'user' | 'assistant' | 'system'

export interface Message {
  id: string
  chatId: string
  role: MessageRole
  content: string
  createdAt: string
}

export interface CreateMessageInput {
  chatId: string
  role: MessageRole
  content: string
}
