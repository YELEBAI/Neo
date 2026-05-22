import type { RegexRule } from '@neo-tavern/shared'

export interface SideBlock {
  name: string
  content: string
}

export interface SplitResult {
  mainContent: string
  promptContent: string
  sideBlocks: SideBlock[]
}

export function applyRegexRules(content: string, rules: RegexRule[]): SplitResult {
  const enabled = rules.filter((r) => r.enabled)
  const sideBlocks: SideBlock[] = []
  let promptContent = content

  for (const rule of enabled) {
    try {
      const regex = new RegExp(rule.pattern, 'gs')
      const matches = [...content.matchAll(regex)]
      if (matches.length === 0) continue

      for (const match of matches) {
        let display = rule.displayTemplate
        for (let i = 1; i < match.length; i++) {
          display = display.replace(`$${i}`, match[i] || '')
        }
        sideBlocks.push({ name: rule.name, content: display })
      }

      if (rule.stripFromPrompt) {
        promptContent = promptContent.replace(regex, '')
      }
    } catch {
      continue
    }
  }

  promptContent = promptContent.trim()

  return {
    mainContent: content,
    promptContent,
    sideBlocks,
  }
}

export function stripPromptContent(content: string, rules: RegexRule[]): string {
  const enabled = rules.filter((r) => r.enabled && r.stripFromPrompt)
  let result = content
  for (const rule of enabled) {
    try {
      result = result.replace(new RegExp(rule.pattern, 'gs'), '')
    } catch {
      continue
    }
  }
  return result.trim()
}
