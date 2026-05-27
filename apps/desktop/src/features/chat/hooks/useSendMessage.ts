import { useState, useCallback } from 'react'
import { useChatStore } from '../chat.store'
import { useSettingsStore } from '@/features/settings/settings.store'
import { chatMemoryRepository, presetRepository, settingsRepository } from '@/db/repositories'
import { buildLightweightMemorySummary, createMemoryContextBlock, hashMessages, splitMessagesByRecentTurns } from '../memory'
import { buildChatPrompt, createModelProvider, stripPromptContent, WorldbookContributor } from '@neo-tavern/core'
import type { Character, BuiltPrompt, ContextBlock, Message, ModelConfig } from '@neo-tavern/shared'
import type { GenerationPhase } from '../chat.types'
import { useWorldbookStore } from '@/features/settings/worldbook.store'

interface UseSendMessageOptions {
  character: Character | undefined
  chatId: string | undefined
  onPromptBuilt?: (built: BuiltPrompt) => void
}

interface SendMessageOptions {
  hiddenUserMessage?: boolean
}

interface UseSendMessageReturn {
  sendMessage: (content: string, options?: SendMessageOptions) => Promise<void>
  regenerate: () => Promise<void>
  abort: () => void
  sending: boolean
  sendingChatId: string | null
  streamingMessageId: string | null
  generationPhase: GenerationPhase | null
  error: string | null
  clearError: () => void
}

let activeAbortController: AbortController | null = null
let activeGenerationId: string | null = null

const LOCAL_MEMORY_COMPRESSOR_KEY = 'local'

function capText(content: string, maxChars: number) {
  const normalized = content.replace(/\r\n/g, '\n').trim()
  if (normalized.length <= maxChars) return normalized
  return `${normalized.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`
}

function formatMessagesForCompression(messages: Message[], maxChars: number) {
  const sourceLimit = Math.max(60_000, Math.min(240_000, maxChars * 20))
  const source = messages.map((message, index) => {
    const role = message.role === 'user'
      ? '用户'
      : message.role === 'assistant'
        ? '角色'
        : '系统'
    return `### ${index + 1}. ${role}\n${capText(message.content, 4000)}`
  }).join('\n\n')

  if (source.length <= sourceLimit) return source
  return `（来源过长，已优先保留靠后的旧剧情片段。）\n${source.slice(source.length - sourceLimit).trimStart()}`
}

function getMemoryCompressorKey(config: ModelConfig | null) {
  if (!config) return LOCAL_MEMORY_COMPRESSOR_KEY
  return [
    'model',
    config.id,
    config.baseUrl,
    config.model,
    config.maxTokens,
    config.updatedAt,
  ].join(':')
}

async function resolveMemoryCompressorConfig(configId: string | null) {
  if (!configId) return null
  const stateConfig = useSettingsStore.getState().modelConfigs.find((config) => config.id === configId)
  return stateConfig ?? settingsRepository.getModelConfig(configId)
}

async function buildModelMemorySummary(
  messages: Message[],
  maxChars: number,
  compressorConfig: ModelConfig,
  signal?: AbortSignal
) {
  const provider = createModelProvider(compressorConfig)
  const source = formatMessagesForCompression(messages, maxChars)
  const result = await provider.generate({
    messages: [
      {
        role: 'system',
        content: [
          '你是 NeoTavern 的剧情记忆压缩器。',
          '你的任务是把较早对话压缩成稳定记忆，用于后续角色扮演保持连续性。',
          '只记录已经发生或已经明确设定的事实，不续写剧情，不新增设定，不评价内容。',
          '优先保留：角色关系、地点、物品、承诺、目标、伤势/状态、未解决事件、用户角色已经做过的事。',
        ].join('\n'),
      },
      {
        role: 'user',
        content: [
          `请把以下较早对话压缩到 ${maxChars} 字符以内。`,
          '使用简洁中文分点；最近完整对话会单独提供，所以这里只需要旧剧情记忆。',
          '不要输出解释，不要说“好的”，直接输出摘要。',
          '',
          source,
        ].join('\n'),
      },
    ],
    model: compressorConfig.model,
    temperature: Math.min(compressorConfig.temperature ?? 0.2, 0.3),
    maxTokens: Math.min(
      Math.max(800, Math.ceil(maxChars / 1.6)),
      Math.max(800, compressorConfig.maxTokens || 4096),
      8192
    ),
    reasoningEffort: compressorConfig.reasoningEffort || undefined,
    signal,
  })

  const summary = result.content.trim()
  if (!summary) throw new Error('Compression API returned an empty summary.')
  const header = '以下是较早剧情的智能记忆摘要，用于保持连续性；最近完整对话仍以后续消息为准。'
  return capText(summary.startsWith(header) ? summary : `${header}\n${summary}`, maxChars)
}

export function useSendMessage({ character, chatId, onPromptBuilt }: UseSendMessageOptions): UseSendMessageReturn {
  const [error, setError] = useState<string | null>(null)
  const addMessage = useChatStore((s) => s.addMessage)
  const patchMessage = useChatStore((s) => s.patchMessage)
  const deleteMessage = useChatStore((s) => s.deleteMessage)
  const sending = useChatStore((s) => s.sending)
  const sendingChatId = useChatStore((s) => s.sendingChatId)
  const streamingMessageId = useChatStore((s) => s.streamingMessageId)
  const generationPhase = useChatStore((s) => s.generationPhase)
  const beginSending = useChatStore((s) => s.beginSending)
  const setStreamingMessageId = useChatStore((s) => s.setStreamingMessageId)
  const setGenerationPhase = useChatStore((s) => s.setGenerationPhase)
  const finishSending = useChatStore((s) => s.finishSending)

  const beginGeneration = (nextChatId: string, controller: AbortController) => {
    const generationId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    activeAbortController = controller
    activeGenerationId = generationId
    beginSending(nextChatId)
    setError(null)
    return generationId
  }

  const finishGeneration = (generationId: string | null, finishedChatId?: string) => {
    if (activeGenerationId && generationId && activeGenerationId !== generationId) return
    activeAbortController = null
    activeGenerationId = null
    finishSending(finishedChatId)
  }

  const abort = useCallback(() => {
    if (activeAbortController) {
      activeAbortController.abort()
      activeAbortController = null
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

  const removeEmptyStreamingDraft = async () => {
    const draftId = useChatStore.getState().streamingMessageId
    if (!draftId) return
    const draft = useChatStore.getState().messages.find((m) => m.id === draftId)
    if (draft && !draft.content.trim() && !draft.reasoningContent?.trim()) {
      await deleteMessage(draftId)
    }
  }

  const getWorldbookContextBlocks = async (userInput: string, recentMessages: Message[]) => {
    const { worldbooks, activeWorldbookId } = useWorldbookStore.getState()
    if (!activeWorldbookId || !character) return []
    const wb = worldbooks.find((w) => w.id === activeWorldbookId)
    if (!wb || wb.entries.length === 0) return []
    const contributor = new WorldbookContributor()
    contributor.setEntries(wb.entries)
    return contributor.contribute({
      character,
      recentMessages,
      userInput,
    })
  }

  const getMemoryPromptPlan = async (historyMessages: Message[], signal?: AbortSignal): Promise<{ recentMessages: Message[]; memoryBlock: ContextBlock | null }> => {
    const settings = useSettingsStore.getState()
    const { memoryMessages, recentMessages } = splitMessagesByRecentTurns(historyMessages, settings.promptRecentTurns)
    if (memoryMessages.length === 0) {
      return { recentMessages, memoryBlock: null }
    }

    const memorySourceMessages = stripMessages(memoryMessages) as Message[]
    const sourceHash = hashMessages(memorySourceMessages)
    const compressorConfig = await resolveMemoryCompressorConfig(settings.memoryCompressorConfigId)
    const compressorKey = getMemoryCompressorKey(compressorConfig)
    const cached = chatId ? await chatMemoryRepository.get(chatId) : null
    const cacheHit = !!cached
      && cached.sourceHash === sourceHash
      && cached.compressorKey === compressorKey
      && cached.memorySummaryMaxChars === settings.memorySummaryMaxChars

    let compressionMode: 'local' | 'model' | 'fallback' = compressorConfig ? 'fallback' : 'local'
    let summary = cacheHit
      ? cached!.summary
      : ''

    if (!cacheHit) {
      if (compressorConfig) {
        try {
          summary = await buildModelMemorySummary(memorySourceMessages, settings.memorySummaryMaxChars, compressorConfig, signal)
          compressionMode = 'model'
        } catch (err) {
          if ((err as Error).name === 'AbortError') throw err
          summary = buildLightweightMemorySummary(memorySourceMessages, settings.memorySummaryMaxChars)
          compressionMode = 'fallback'
        }
      } else {
        summary = buildLightweightMemorySummary(memorySourceMessages, settings.memorySummaryMaxChars)
        compressionMode = 'local'
      }
    }

    if (chatId && !cacheHit) {
      await chatMemoryRepository.upsert({
        chatId,
        summary,
        sourceHash,
        sourceMessageCount: memorySourceMessages.length,
        compressorConfigId: compressorConfig?.id ?? null,
        compressorKey,
        compressionMode,
        memorySummaryMaxChars: settings.memorySummaryMaxChars,
      })
    }

    return {
      recentMessages,
      memoryBlock: createMemoryContextBlock(summary),
    }
  }

  const sendMessage = useCallback(async (content: string, options: SendMessageOptions = {}) => {
    const trimmedContent = content.trim()
    if (!trimmedContent || !chatId || !character) return

    const controller = new AbortController()
    const generationId = beginGeneration(chatId, controller)

    try {
      if (!options.hiddenUserMessage) {
        await addMessage({
          chatId,
          role: 'user',
          content: trimmedContent,
        })
      }

      const { messages: recentMessages } = useChatStore.getState()
      const contextTokens = useSettingsStore.getState().contextTokens || 64000

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

      const historyMessages = options.hiddenUserMessage ? recentMessages : recentMessages.slice(0, -1)
      const memoryPlan = await getMemoryPromptPlan(historyMessages, controller.signal)
      const worldbookBlocks = await getWorldbookContextBlocks(trimmedContent, recentMessages)
      const contextBlocks = [
        memoryPlan.memoryBlock,
        ...worldbookBlocks,
      ].filter(Boolean) as ContextBlock[]

      const built = buildChatPrompt({
        character,
        recentMessages: stripMessages(memoryPlan.recentMessages) as Message[],
        userInput: trimmedContent,
        maxTotalTokens: contextTokens,
        presetItems,
        contextBlocks,
        userName: useSettingsStore.getState().personaName,
      })

      if (onPromptBuilt) {
        onPromptBuilt(built)
      }

      const modelConfig = useSettingsStore.getState().modelConfig
      if (!modelConfig) {
        throw new Error('Model not configured. Please set up API settings first.')
      }

      const provider = createModelProvider(modelConfig)
      const genStart = Date.now()
      const assistant = await addMessage({
        chatId,
        role: 'assistant',
        content: '',
      })
      setStreamingMessageId(assistant.id)

      let nextContent = ''
      let nextReasoningContent = ''
      let nextUsage: Awaited<ReturnType<typeof provider.generate>>['usage'] | undefined
      let thinkingDuration: number | undefined
      const showLiveText = modelConfig.streamingEnabled !== false

      if (provider.streamGenerate) {
        for await (const chunk of provider.streamGenerate({
          messages: built.messages,
          model: modelConfig.model,
          temperature: modelConfig.temperature,
          maxTokens: modelConfig.maxTokens,
          reasoningEffort: modelConfig.reasoningEffort || undefined,
          signal: controller.signal,
        })) {
          if (activeGenerationId !== generationId) break
          if (chunk.reasoningContentDelta) {
            nextReasoningContent += chunk.reasoningContentDelta
            if (useChatStore.getState().generationPhase !== 'writing') {
              setGenerationPhase('thinking')
            }
          }
          if (chunk.contentDelta) {
            thinkingDuration ??= Date.now() - genStart
            nextContent += chunk.contentDelta
            setGenerationPhase('writing')
          }
          if (chunk.usage) nextUsage = chunk.usage
          if (chunk.reasoningContentDelta || chunk.contentDelta || chunk.usage) {
            await patchMessage(assistant.id, {
              content: showLiveText ? nextContent : '',
              reasoningContent: nextReasoningContent || undefined,
              thinkingDuration,
              usage: nextUsage,
            }, { persist: false })
          }
        }
      } else {
        const result = await provider.generate({
          messages: built.messages,
          model: modelConfig.model,
          temperature: modelConfig.temperature,
          maxTokens: modelConfig.maxTokens,
          reasoningEffort: modelConfig.reasoningEffort || undefined,
          signal: controller.signal,
        })
        thinkingDuration = Date.now() - genStart
        setGenerationPhase('writing')
        await patchMessage(assistant.id, {
          content: '',
          reasoningContent: result.reasoningContent || undefined,
          thinkingDuration,
          usage: result.usage,
        }, { persist: false })
        nextContent = result.content
        nextReasoningContent = result.reasoningContent ?? ''
        nextUsage = result.usage
      }
      thinkingDuration ??= Date.now() - genStart

      await patchMessage(assistant.id, {
        content: nextContent,
        reasoningContent: nextReasoningContent || undefined,
        generateDuration: Date.now() - genStart,
        thinkingDuration,
        usage: nextUsage,
      })
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setError('Generation stopped')
      } else {
        setError((err as Error).message || 'Failed to send message')
      }
      await removeEmptyStreamingDraft()
    } finally {
      finishGeneration(generationId, chatId)
    }
  }, [character, chatId, addMessage, patchMessage, deleteMessage, onPromptBuilt])

  const clearError = useCallback(() => setError(null), [])

  const regenerate = useCallback(async () => {
    if (!chatId || !character) return

    const controller = new AbortController()
    const generationId = beginGeneration(chatId, controller)

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
        return
      }

      const lastAssistantMsg = allMessages[lastAssistantIdx]
      await deleteMessage(lastAssistantMsg.id)

      let lastUserIdx = lastAssistantIdx - 1
      while (lastUserIdx >= 0 && allMessages[lastUserIdx].role !== 'user') lastUserIdx--
      if (lastUserIdx < 0) {
        setError('No user message found to regenerate from')
        return
      }
      const userContent = allMessages[lastUserIdx].content

      const afterDelete = useChatStore.getState().messages
      const contextTokens = useSettingsStore.getState().contextTokens || 64000

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

      const historyMessages = afterDelete.slice(0, -1)
      const memoryPlan = await getMemoryPromptPlan(historyMessages, controller.signal)
      const worldbookBlocks = await getWorldbookContextBlocks(userContent, afterDelete)
      const contextBlocks = [
        memoryPlan.memoryBlock,
        ...worldbookBlocks,
      ].filter(Boolean) as ContextBlock[]

      const built = buildChatPrompt({
        character,
        recentMessages: stripMessages(memoryPlan.recentMessages) as Message[],
        userInput: userContent,
        maxTotalTokens: contextTokens,
        presetItems,
        contextBlocks,
        userName: useSettingsStore.getState().personaName,
      })

      if (onPromptBuilt) onPromptBuilt(built)

      const modelConfig = useSettingsStore.getState().modelConfig
      if (!modelConfig) throw new Error('Model not configured. Please set up API settings first.')

      const provider = createModelProvider(modelConfig)
      const genStart = Date.now()
      const assistant = await addMessage({
        chatId,
        role: 'assistant',
        content: '',
      })
      setStreamingMessageId(assistant.id)

      let nextContent = ''
      let nextReasoningContent = ''
      let nextUsage: Awaited<ReturnType<typeof provider.generate>>['usage'] | undefined
      let thinkingDuration: number | undefined
      const showLiveText = modelConfig.streamingEnabled !== false

      if (provider.streamGenerate) {
        for await (const chunk of provider.streamGenerate({
          messages: built.messages,
          model: modelConfig.model,
          temperature: modelConfig.temperature,
          maxTokens: modelConfig.maxTokens,
          reasoningEffort: modelConfig.reasoningEffort || undefined,
          signal: controller.signal,
        })) {
          if (activeGenerationId !== generationId) break
          if (chunk.reasoningContentDelta) {
            nextReasoningContent += chunk.reasoningContentDelta
            if (useChatStore.getState().generationPhase !== 'writing') {
              setGenerationPhase('thinking')
            }
          }
          if (chunk.contentDelta) {
            thinkingDuration ??= Date.now() - genStart
            nextContent += chunk.contentDelta
            setGenerationPhase('writing')
          }
          if (chunk.usage) nextUsage = chunk.usage
          if (chunk.reasoningContentDelta || chunk.contentDelta || chunk.usage) {
            await patchMessage(assistant.id, {
              content: showLiveText ? nextContent : '',
              reasoningContent: nextReasoningContent || undefined,
              thinkingDuration,
              usage: nextUsage,
            }, { persist: false })
          }
        }
      } else {
        const result = await provider.generate({
          messages: built.messages,
          model: modelConfig.model,
          temperature: modelConfig.temperature,
          maxTokens: modelConfig.maxTokens,
          reasoningEffort: modelConfig.reasoningEffort || undefined,
          signal: controller.signal,
        })
        thinkingDuration = Date.now() - genStart
        setGenerationPhase('writing')
        await patchMessage(assistant.id, {
          content: '',
          reasoningContent: result.reasoningContent || undefined,
          thinkingDuration,
          usage: result.usage,
        }, { persist: false })
        nextContent = result.content
        nextReasoningContent = result.reasoningContent ?? ''
        nextUsage = result.usage
      }
      thinkingDuration ??= Date.now() - genStart

      await patchMessage(assistant.id, {
        content: nextContent,
        reasoningContent: nextReasoningContent || undefined,
        generateDuration: Date.now() - genStart,
        thinkingDuration,
        usage: nextUsage,
      })
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setError('Generation stopped')
      } else {
        setError((err as Error).message || 'Failed to regenerate')
      }
      await removeEmptyStreamingDraft()
    } finally {
      finishGeneration(generationId, chatId)
    }
  }, [character, chatId, addMessage, patchMessage, deleteMessage, onPromptBuilt])

  return { sendMessage, regenerate, abort, sending, sendingChatId, streamingMessageId, generationPhase, error, clearError }
}
