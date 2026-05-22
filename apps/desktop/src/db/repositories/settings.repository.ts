import type { ModelConfig, RegexPreset } from '@neo-tavern/shared'

const STORAGE_KEY = 'neotavern_model_configs'
const ACTIVE_KEY = 'neotavern_active_config_id'
const REGEX_KEY = 'neotavern_regex_presets'
const REGEX_ACTIVE_KEY = 'neotavern_active_regex_preset_id'

function loadFromStorage(): ModelConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveToStorage(configs: ModelConfig[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(configs)) } catch {}
}

export const settingsRepository = {
  async get(key: string): Promise<string | null> {
    return localStorage.getItem(`neotavern_setting_${key}`)
  },

  async set(key: string, value: string): Promise<void> {
    try { localStorage.setItem(`neotavern_setting_${key}`, value) } catch {}
  },

  async getAll(): Promise<Record<string, string>> {
    const result: Record<string, string> = {}
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.startsWith('neotavern_setting_')) {
        result[k.replace('neotavern_setting_', '')] = localStorage.getItem(k) ?? ''
      }
    }
    return result
  },

  async getAllModelConfigs(): Promise<ModelConfig[]> {
    return loadFromStorage()
  },

  async getModelConfig(id: string): Promise<ModelConfig | null> {
    return loadFromStorage().find((c) => c.id === id) ?? null
  },

  async saveModelConfig(config: ModelConfig): Promise<void> {
    const configs = loadFromStorage().filter((c) => c.id !== config.id)
    configs.push(config)
    saveToStorage(configs)
  },

  async deleteModelConfig(id: string): Promise<void> {
    let configs = loadFromStorage()
    configs = configs.filter((c) => c.id !== id)
    saveToStorage(configs)
    if (this.getActiveConfigId() === id) {
      this.setActiveConfigId(configs[0]?.id ?? null)
    }
  },

  async getActiveConfigId(): Promise<string | null> {
    try { return localStorage.getItem(ACTIVE_KEY) } catch { return null }
  },

  async setActiveConfigId(id: string | null): Promise<void> {
    try {
      if (id) localStorage.setItem(ACTIVE_KEY, id)
      else localStorage.removeItem(ACTIVE_KEY)
    } catch {}
  },

  loadRegexRules(): RegexPreset[] {
    try {
      const raw = localStorage.getItem(REGEX_KEY)
      if (!raw) return []
      const data = JSON.parse(raw)
      if (!Array.isArray(data)) return []
      return data.filter((p: any) => p && Array.isArray(p.rules))
    } catch { return [] }
  },

  saveRegexRules(presets: RegexPreset[]): void {
    try { localStorage.setItem(REGEX_KEY, JSON.stringify(presets)) } catch {}
  },

  async getActiveRegexPresetId(): Promise<string | null> {
    try { return localStorage.getItem(REGEX_ACTIVE_KEY) } catch { return null }
  },

  async setActiveRegexPresetId(id: string | null): Promise<void> {
    try {
      if (id) localStorage.setItem(REGEX_ACTIVE_KEY, id)
      else localStorage.removeItem(REGEX_ACTIVE_KEY)
    } catch {}
  },
}
