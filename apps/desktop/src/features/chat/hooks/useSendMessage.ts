import { useState, useCallback, useRef } from 'react'
import { useChatStore } from '../chat.store'
import { useSettingsStore } from '@/features/settings/settings.store'
import { presetRepository } from '@/db/repositories'
import { buildChatPrompt, createModelProvider, stripPromptContent, trimMessagesByTokens } from '@neo-tavern/core'
import type { Character, BuiltPrompt, Message } from '@neo-tavern/shared'

interface UseSendMessageOptions {
  character: Character | undefined
  chatId: string | undefined
  onPromptBuilt?: (built: BuiltPrompt) => void
}

interface UseSendMessageReturn {
  sendMessage: (content: string) => Promise<void>
  regenerate: () => Promise<void>
  abort: () => void
  sending: boolean
  error: string | null
  clearError: () => void
}

export function useSendMessage({ character, chatId, onPromptBuilt }: UseSendMessageOptions): UseSendMessageReturn {
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const addMessage = useChatStore((s) => s.addMessage)
  const deleteMessage = useChatStore((s) => s.deleteMessage)
  const abortRef = useRef<AbortController | null>(null)

  const abort = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
  }, [])

  const stripMessages = (msgs: Message[]): Message[] => {
    const rules = useSettingsStore.getState().getActiveRegexRules()
    if (!rules || rules.length === 0) return msgs
    return msgs.map((m) =>
      m.role === 'assistant'
        ? { ...m, content: stripPromptContent(m.content, rules) }
        : m
    )
  }

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || !chatId || !character) return

    const controller = new AbortController()
    abortRef.current = controller
    setSending(true)
    setError(null)

    try {
      await addMessage({
        chatId,
        role: 'user',
        content: content.trim(),
      })

      const { messages: recentMessages } = useChatStore.getState()
      const contextTokens = useSettingsStore.getState().contextTokens || 8000

      const activePresetId = await presetRepository.getActivePresetId()
      let presetItems: { role: 'system' | 'user'; content: string; injectionOrder: number }[] | undefined
      if (activePresetId) {
        const preset = await presetRepository.getById(activePresetId)
        if (preset) {
          presetItems = preset.items
            .filter((i) => i.enabled)
            .map((i) => ({
              role: i.role,
              content: i.content,
              injectionOrder: i.injectionOrder,
            }))
        }
      }

      const built = buildChatPrompt({
        character,
        recentMessages: trimMessagesByTokens(stripMessages(recentMessages), contextTokens) as Message[],
        userInput: content.trim(),
        presetItems,
      })

      if (onPromptBuilt) {
        onPromptBuilt(built)
      }

      const modelConfig = useSettingsStore.getState().modelConfig
      if (!modelConfig) {
        throw new Error('Model not configured. Please set up API settings first.')
      }

      const provider = createModelProvider(modelConfig)

      const result = await provider.generate({
        messages: built.messages,
        model: modelConfig.model,
        temperature: modelConfig.temperature,
        maxTokens: modelConfig.maxTokens,
        signal: controller.signal,
      })

      await addMessage({
        chatId,
        role: 'assistant',
        content: result.content,
      })
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setError('Generation stopped')
      } else {
        setError((err as Error).message || 'Failed to send message')
      }
    } finally {
      setSending(false)
      abortRef.current = null
    }
  }, [character, chatId, addMessage, onPromptBuilt])

  const clearError = useCallback(() => setError(null), [])

  const regenerate = useCallback(async () => {
    if (!chatId || !character) return

    const controller = new AbortController()
    abortRef.current = controller
    setSending(true)
    setError(null)

    try {
      const { messages: allMessages } = useChatStore.getState()

      let lastAssistantIdx = -1
      for (let i = allMessages.length - 1; i >= 0; i--) {
        if (allMessages[i].role === 'assistant') {
          lastAssistantIdx = i
          break
        }
      }
      if (lastAssistantIdx < 0) {
        setError('No AI response to regenerate')
        setSending(false)
        return
      }

      const lastAssistantMsg = allMessages[lastAssistantIdx]
      await deleteMessage(lastAssistantMsg.id)

      let lastUserIdx = lastAssistantIdx - 1
      while (lastUserIdx >= 0 && allMessages[lastUserIdx].role !== 'user') lastUserIdx--
      if (lastUserIdx < 0) {
        setError('No user message found to regenerate from')
        setSending(false)
        return
      }
      const userContent = allMessages[lastUserIdx].content

      const afterDelete = useChatStore.getState().messages
      const contextTokens = useSettingsStore.getState().contextTokens || 8000

      const activePresetId = await presetRepository.getActivePresetId()
      let presetItems: { role: 'system' | 'user'; content: string; injectionOrder: number }[] | undefined
      if (activePresetId) {
        const preset = await presetRepository.getById(activePresetId)
        if (preset) {
          presetItems = preset.items
            .filter((i) => i.enabled)
            .map((i) => ({ role: i.role, content: i.content, injectionOrder: i.injectionOrder }))
        }
      }

      const built = buildChatPrompt({
        character,
        recentMessages: trimMessagesByTokens(stripMessages(afterDelete), contextTokens) as Message[],
        userInput: userContent,
        presetItems,
      })

      if (onPromptBuilt) onPromptBuilt(built)

      const modelConfig = useSettingsStore.getState().modelConfig
      if (!modelConfig) throw new Error('Model not configured. Please set up API settings first.')

      const provider = createModelProvider(modelConfig)
      const result = await provider.generate({
        messages: built.messages,
        model: modelConfig.model,
        temperature: modelConfig.temperature,
        maxTokens: modelConfig.maxTokens,
        signal: controller.signal,
      })

      await addMessage({ chatId, role: 'assistant', content: result.content })
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setError('Generation stopped')
      } else {
        setError((err as Error).message || 'Failed to regenerate')
      }
    } finally {
      setSending(false)
      abortRef.current = null
    }
  }, [character, chatId, addMessage, deleteMessage, onPromptBuilt])

  return { sendMessage, regenerate, abort, sending, error, clearError }
}
