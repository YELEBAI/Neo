import { generateId } from '@neo-tavern/shared'
import type { Preset, PresetItem, CreatePresetInput, UpdatePresetInput, CreatePresetItemInput, UpdatePresetItemInput, RegexPreset, RegexRule } from '@neo-tavern/shared'

const STORAGE_KEY = 'neotavern_presets'
const ACTIVE_KEY = 'neotavern_active_preset_id'
const REGEX_KEY = 'neotavern_regex_presets'

function loadRegexPresets(): RegexPreset[] {
  try {
    const raw = localStorage.getItem(REGEX_KEY)
    if (!raw) return []
    const data = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    return data.filter((p) => p && Array.isArray(p.rules))
  } catch { return [] }
}

function saveRegexPresets(presets: RegexPreset[]) {
  try { localStorage.setItem(REGEX_KEY, JSON.stringify(presets)) } catch {}
}

function loadAll(): Preset[] {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : [] } catch { return [] }
}

function saveAll(presets: Preset[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(presets)) } catch {}
}

export const presetRepository = {
  async list(): Promise<Preset[]> {
    return loadAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  },

  async getById(id: string): Promise<Preset | null> {
    return loadAll().find((p) => p.id === id) ?? null
  },

  async create(input: CreatePresetInput): Promise<Preset> {
    const now = new Date().toISOString()
    const preset: Preset = {
      id: generateId(),
      name: input.name,
      description: input.description,
      items: [],
      createdAt: now,
      updatedAt: now,
    }
    const all = loadAll()
    all.push(preset)
    saveAll(all)
    return preset
  },

  async update(id: string, input: UpdatePresetInput): Promise<Preset> {
    const all = loadAll()
    const idx = all.findIndex((p) => p.id === id)
    if (idx === -1) throw new Error(`Preset not found: ${id}`)
    const existing = all[idx]
    if (input.name !== undefined) existing.name = input.name
    if (input.description !== undefined) existing.description = input.description
    existing.updatedAt = new Date().toISOString()
    all[idx] = existing
    saveAll(all)
    return existing
  },

  async delete(id: string): Promise<void> {
    saveAll(loadAll().filter((p) => p.id !== id))
    if (await this.getActivePresetId() === id) {
      await this.setActivePresetId(null)
    }
  },

  async addItem(presetId: string, input: CreatePresetItemInput): Promise<PresetItem> {
    const all = loadAll()
    const idx = all.findIndex((p) => p.id === presetId)
    if (idx === -1) throw new Error(`Preset not found: ${presetId}`)
    const now = new Date().toISOString()
    const item: PresetItem = {
      id: generateId(),
      presetId,
      name: input.name,
      enabled: input.enabled,
      role: input.role,
      content: input.content,
      injectionOrder: input.injectionOrder,
      createdAt: now,
      updatedAt: now,
    }
    all[idx].items.push(item)
    all[idx].updatedAt = now
    saveAll(all)
    return item
  },

  async updateItem(presetId: string, itemId: string, input: UpdatePresetItemInput): Promise<PresetItem> {
    const all = loadAll()
    const pIdx = all.findIndex((p) => p.id === presetId)
    if (pIdx === -1) throw new Error(`Preset not found: ${presetId}`)
    const iIdx = all[pIdx].items.findIndex((i) => i.id === itemId)
    if (iIdx === -1) throw new Error(`Preset item not found: ${itemId}`)
    const item = all[pIdx].items[iIdx]
    if (input.name !== undefined) item.name = input.name
    if (input.enabled !== undefined) item.enabled = input.enabled
    if (input.role !== undefined) item.role = input.role
    if (input.content !== undefined) item.content = input.content
    if (input.injectionOrder !== undefined) item.injectionOrder = input.injectionOrder
    item.updatedAt = new Date().toISOString()
    all[pIdx].items[iIdx] = item
    all[pIdx].updatedAt = new Date().toISOString()
    saveAll(all)
    return item
  },

  async deleteItem(presetId: string, itemId: string): Promise<void> {
    const all = loadAll()
    const pIdx = all.findIndex((p) => p.id === presetId)
    if (pIdx === -1) throw new Error(`Preset not found: ${presetId}`)
    all[pIdx].items = all[pIdx].items.filter((i) => i.id !== itemId)
    all[pIdx].updatedAt = new Date().toISOString()
    saveAll(all)
  },

  async getActivePresetId(): Promise<string | null> {
    try { return localStorage.getItem(ACTIVE_KEY) } catch { return null }
  },

  async setActivePresetId(id: string | null): Promise<void> {
    try {
      if (id) localStorage.setItem(ACTIVE_KEY, id)
      else localStorage.removeItem(ACTIVE_KEY)
    } catch {}
  },

  async importFromJson(json: string): Promise<Preset> {
    const data = JSON.parse(json)
    const now = new Date().toISOString()

    let presetName = data.name || 'Imported Preset'
    if (!data.name) {
      const extName = data.extensions?.presetdetailnfo?.nameGroup
      if (extName) presetName = extName
    }

    const preset: Preset = {
      id: generateId(),
      name: presetName,
      description: data.description || '',
      items: [],
      createdAt: now,
      updatedAt: now,
    }
    const prompts = data.prompts || []
    for (const p of prompts) {
      if (!p.content) continue
      const item: PresetItem = {
        id: generateId(),
        presetId: preset.id,
        name: p.name || 'Untitled',
        enabled: p.enabled !== false,
        role: p.role === 'user' ? 'user' : 'system',
        content: p.content,
        injectionOrder: p.injection_order || p.injectionOrder || 100,
        createdAt: now,
        updatedAt: now,
      }
      preset.items.push(item)
    }
    const all = loadAll()
    all.push(preset)
    saveAll(all)

    try {
      const regexScripts: Array<{
        scriptName: string
        findRegex: string
        replaceString: string
        disabled: boolean
        markdownOnly: boolean
        promptOnly: boolean
      }> = data.regex_scripts
        || data.extensions?.SPreset?.RegexBinding?.regexes
        || []

      if (regexScripts.length > 0) {
        const existingPresets = loadRegexPresets()
        const existingPatterns = new Set<string>()
        for (const ep of existingPresets) {
          if (Array.isArray(ep.rules)) {
            for (const r of ep.rules) existingPatterns.add(r.pattern)
          }
        }
        const newRules: RegexRule[] = []

        for (const s of regexScripts) {
          if (s.disabled) continue
          if (!s.findRegex) continue

          const pattern = parseStRegex(s.findRegex)
          if (!pattern) continue
          if (existingPatterns.has(pattern)) continue

          if (s.scriptName === '世界书标记') continue

          const isDisplay = s.markdownOnly && !s.promptOnly
          const isPromptTransform = s.promptOnly && !s.markdownOnly
          if (!isDisplay && !isPromptTransform) continue

          let displayTemplate = ''
          if (isDisplay) {
            displayTemplate = buildDisplayTemplate(s.findRegex, s.replaceString)
          }

          const rule: RegexRule = {
            id: generateId(),
            presetId: '',
            name: s.scriptName || 'Imported Rule',
            pattern,
            displayTemplate,
            stripFromPrompt: isDisplay,
            enabled: true,
            createdAt: now,
          }
          newRules.push(rule)
          existingPatterns.add(pattern)
        }

        if (newRules.length > 0) {
          const presetId = generateId()
          for (const r of newRules) r.presetId = presetId
          const regexPreset: RegexPreset = {
            id: presetId,
            name: presetName + ' Regex',
            description: 'Auto-imported from ' + presetName,
            rules: newRules,
            createdAt: now,
            updatedAt: now,
          }
          saveRegexPresets([...existingPresets, regexPreset])
        }
      }
    } catch (e) {
      console.error('importFromJson: failed to import regex rules:', e)
    }

    return preset
  },
}

function parseStRegex(findRegex: string): string | null {
  const m = findRegex.match(/^\/(.+)\/([a-z]*)$/)
  if (!m) return null
  return m[1]
}

function buildDisplayTemplate(findRegex: string, replaceString: string): string {
  const pattern = parseStRegex(findRegex)
  if (!pattern) return ''

  let count = 0
  let i = 0
  while (i < pattern.length) {
    if (pattern[i] === '\\') { i += 2; continue }
    if (pattern[i] === '(') {
      if (i + 2 < pattern.length && pattern[i + 1] === '?' && pattern[i + 2] === ':') {
        i += 3
        let depth = 1
        while (i < pattern.length && depth > 0) {
          if (pattern[i] === '\\') { i += 2; continue }
          if (pattern[i] === '(') depth++
          if (pattern[i] === ')') depth--
          i++
        }
        continue
      }
      if (i + 2 < pattern.length && pattern[i + 1] === '?') {
        const c = pattern[i + 2]
        if (c === '<' || c === '=' || c === '!') {
          i += 3
          while (i < pattern.length && pattern[i] !== ')') i++
          i++
          continue
        }
      }
      count++
    }
    i++
  }

  if (count === 0) return ''
  if (count === 1) return '$1'

  const used: string[] = []
  const re = /\$(\d+)/g
  let m
  while ((m = re.exec(replaceString)) !== null) {
    if (!used.includes(m[1])) used.push(m[1])
  }
  if (used.length > 0) return used.map((n) => `$${n}`).join(' ')
  return Array.from({ length: count }, (_, i) => `$${i + 1}`).join(' ')
}
