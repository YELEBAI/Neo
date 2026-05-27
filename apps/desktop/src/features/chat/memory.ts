import type { ContextBlock, Message } from '@neo-tavern/shared'

export const DEFAULT_PROMPT_RECENT_TURNS = 12
export const DEFAULT_MEMORY_SUMMARY_MAX_CHARS = 4500

export interface PromptMemorySettings {
  promptRecentTurns: number
  memorySummaryMaxChars: number
}

function normalizeText(content: string) {
  return content.replace(/\s+/g, ' ').trim()
}

function clip(content: string, maxChars: number) {
  if (content.length <= maxChars) return content
  return `${content.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`
}

export function hashMessages(messages: Message[]) {
  let hash = 2166136261
  for (const message of messages) {
    const text = `${message.role}\u0000${message.id}\u0000${message.content}\u0000`
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i)
      hash = Math.imul(hash, 16777619)
    }
  }
  return (hash >>> 0).toString(36)
}

export function splitMessagesByRecentTurns(messages: Message[], turnLimit: number) {
  const limit = Math.max(1, Math.floor(turnLimit || DEFAULT_PROMPT_RECENT_TURNS))
  let turns = 0

  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role !== 'user') continue
    turns += 1
    if (turns > limit) {
      let start = i + 1
      while (start < messages.length && messages[start].role !== 'user') start += 1
      return {
        memoryMessages: messages.slice(0, start),
        recentMessages: messages.slice(start),
      }
    }
  }

  return {
    memoryMessages: [] as Message[],
    recentMessages: messages,
  }
}

export function buildLightweightMemorySummary(messages: Message[], maxChars: number) {
  if (messages.length === 0) return ''

  const lines = messages.map((message) => {
    const role = message.role === 'user'
      ? '用户'
      : message.role === 'assistant'
        ? '角色'
        : '系统'
    const maxLineChars = message.role === 'assistant' ? 320 : 220
    return `- ${role}: ${clip(normalizeText(message.content), maxLineChars)}`
  })

  const header = '以下是较早剧情的轻量记忆摘要，用于保持连续性；最近完整对话仍以后续消息为准。'
  const kept: string[] = []
  for (let i = lines.length - 1; i >= 0; i--) {
    const next = [lines[i], ...kept]
    if (`${header}\n${next.join('\n')}`.length > maxChars && kept.length > 0) break
    kept.unshift(lines[i])
  }

  return `${header}\n${kept.join('\n')}`
}

export function createMemoryContextBlock(summary: string): ContextBlock | null {
  if (!summary.trim()) return null
  return {
    id: 'chat-memory-summary',
    source: 'memory',
    title: 'Scene Memory Summary',
    content: summary,
    priority: 10_000,
    role: 'system',
    position: 'beforeHistory',
  }
}
