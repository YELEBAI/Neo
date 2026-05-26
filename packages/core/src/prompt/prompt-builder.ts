import type { BuildPromptInput, BuiltPrompt, GenerateMessage, ContextBlock } from '@neo-tavern/shared'

const DEFAULT_SYSTEM_RULES = [
  '你正在扮演所选角色。',
  '始终与角色设定和场景保持一致。',
  '除非用户明确要求，否则不要替用户说话或行动。',
  '保持与最近的对话消息一致。',
  '遵守适用的安全规则，避免不当内容。',
].join('\n')

const DIALOGUE_FORMAT_RULES = [
  '',
  '对话格式要求：',
  '当角色说话时，在每句对话前加上角色名和冒号，格式如：角色名："对话内容"',
  '每句对话独占一行，与叙述文字分开。',
  '此格式仅用于实际说出声的对话。叙述和内心活动保持普通文本格式。',
].join('\n')

function estTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

export function trimMessagesByTokens(messages: { role: string; content: string }[], maxTokens: number): { role: string; content: string }[] {
  if (messages.length === 0) return []
  if (maxTokens <= 0) return [...messages]
  let total = 0
  const kept: (typeof messages) = []
  for (let i = messages.length - 1; i >= 0; i--) {
    const tokens = Math.ceil(messages[i].content.length / 4)
    if (total + tokens > maxTokens && kept.length > 0) break
    kept.unshift(messages[i])
    total += tokens
  }
  return kept
}

export function buildChatPrompt(input: BuildPromptInput): BuiltPrompt {
  const messages: GenerateMessage[] = []
  const uname = input.userName || 'User'

  const safeReplace = (s: string) => s.replace(/\{\{user\}\}/gi, uname).replace(/<user>/gi, uname)

  const systemRules = input.systemRules ?? DEFAULT_SYSTEM_RULES
  const characterBlock = safeReplace([
    `Character Name: ${input.character.name}`,
    `Description: ${input.character.description}`,
    `Personality: ${input.character.personality}`,
    `Scenario: ${input.character.scenario}`,
    input.character.exampleDialogues
      ? `Example Dialogues:\n${input.character.exampleDialogues}`
      : '',
  ].filter(Boolean).join('\n\n'))

  const sortedPresetItems = (input.presetItems ?? [])
    .slice()
    .sort((a, b) => a.injectionOrder - b.injectionOrder)

  const hasSystemPreset = sortedPresetItems.some(p => p.role === 'system')
  const presetContent = sortedPresetItems
    .map((item) => safeReplace(item.content))
    .filter((content) => content.trim().length > 0)
    .join('\n\n')
  const presetMessage: GenerateMessage | null = presetContent
    ? {
        role: hasSystemPreset ? 'system' : sortedPresetItems[0]?.role ?? 'system',
        content: presetContent,
      }
    : null

  const sortedContextBlocks = [...(input.contextBlocks ?? [])].sort(
    (a, b) => b.priority - a.priority
  )

  if (!hasSystemPreset) {
    messages.push({
      role: 'system',
      content: safeReplace(systemRules + DIALOGUE_FORMAT_RULES),
    })
  }

  if (presetMessage) messages.push(presetMessage)

  messages.push({ role: 'system', content: characterBlock })

  if (input.userPersona) {
    messages.push({ role: 'system', content: safeReplace(`User Persona:\n${input.userPersona}`) })
  }

  const userInputMsg: GenerateMessage = { role: 'user', content: input.userInput }

  const maxTokens = input.maxTotalTokens && input.maxTotalTokens > 0 ? input.maxTotalTokens : 0
  if (maxTokens > 0) {
    let overhead = estTokens(DIALOGUE_FORMAT_RULES)
    if (!hasSystemPreset) overhead += estTokens(safeReplace(systemRules))
    if (presetMessage) overhead += estTokens(presetMessage.content)
    overhead += estTokens(characterBlock)
    if (input.userPersona) overhead += estTokens(safeReplace(`User Persona:\n${input.userPersona}`))
    overhead += estTokens(input.userInput)

    const historyBudget = maxTokens - overhead - 100
    const trimmed = historyBudget > 0
      ? trimMessagesByTokens(input.recentMessages, historyBudget)
      : input.recentMessages.slice(-2)

    for (const message of trimmed) {
      messages.push({ role: message.role as 'user' | 'assistant' | 'system', content: message.content })
    }
  } else {
    for (const message of input.recentMessages) {
      messages.push({ role: message.role as 'user' | 'assistant' | 'system', content: message.content })
    }
  }

  if (input.character.firstMessage && input.recentMessages.length === 0) {
    messages.push({ role: 'assistant', content: safeReplace(input.character.firstMessage) })
  }

  for (const block of sortedContextBlocks) {
    messages.push({ role: 'system', content: safeReplace(`[${block.source}] ${block.title}\n${block.content}`) })
  }

  messages.push(userInputMsg)

  const previewText = messages
    .map((message) => `## ${message.role}\n${message.content}`)
    .join('\n\n---\n\n')

  const tokenEstimate = estimateTokens(messages)

  return {
    messages,
    previewText,
    tokenEstimate,
    includedContextBlocks: sortedContextBlocks,
  }
}

export function estimateTokens(messages: GenerateMessage[]): number {
  const text = messages.map((m) => m.content).join('\n')
  return Math.ceil(text.length / 4)
}

export { DEFAULT_SYSTEM_RULES, DIALOGUE_FORMAT_RULES }
