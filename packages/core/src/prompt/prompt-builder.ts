import type { BuildPromptInput, BuiltPrompt, GenerateMessage, ContextBlock } from '@neo-tavern/shared'

const DEFAULT_SYSTEM_RULES = [
  'You are roleplaying as the selected character.',
  'Stay consistent with the character profile and scenario.',
  'Do not speak or act for the user unless explicitly requested.',
  'Keep the conversation coherent with recent messages.',
  'Follow applicable safety rules and avoid disallowed content.',
].join('\n')

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

  const systemRules = input.systemRules ?? DEFAULT_SYSTEM_RULES

  messages.push({
    role: 'system',
    content: systemRules,
  })

  if (input.presetItems && input.presetItems.length > 0) {
    const sortedPresetItems = [...input.presetItems].sort(
      (a, b) => a.injectionOrder - b.injectionOrder
    )
    for (const item of sortedPresetItems) {
      messages.push({
        role: item.role,
        content: item.content,
      })
    }
  }

  messages.push({
    role: 'system',
    content: [
      `Character Name: ${input.character.name}`,
      `Description: ${input.character.description}`,
      `Personality: ${input.character.personality}`,
      `Scenario: ${input.character.scenario}`,
      input.character.exampleDialogues
        ? `Example Dialogues:\n${input.character.exampleDialogues}`
        : '',
    ].filter(Boolean).join('\n\n'),
  })

  if (input.userPersona) {
    messages.push({
      role: 'system',
      content: `User Persona:\n${input.userPersona}`,
    })
  }

  const sortedContextBlocks = [...(input.contextBlocks ?? [])].sort(
    (a, b) => b.priority - a.priority
  )

  for (const block of sortedContextBlocks) {
    messages.push({
      role: 'system',
      content: `[${block.source}] ${block.title}\n${block.content}`,
    })
  }

  for (const message of input.recentMessages) {
    messages.push({
      role: message.role,
      content: message.content,
    })
  }

  messages.push({
    role: 'user',
    content: input.userInput,
  })

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

export { DEFAULT_SYSTEM_RULES }
