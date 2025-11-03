import { Store } from '@tanstack/react-store'
import { type } from 'arktype'

const settingsStoreType = type({
  aiProvider: '"local-ollama" | "user-keys"',
  defaultLocalModel: 'string',
  useLocalAI: 'boolean',
  selectedModelProfile: '"performant" | "balanced" | "fast"',
})

const defaultSettings: typeof settingsStoreType.infer = {
  aiProvider: 'local-ollama',
  defaultLocalModel: 'qwen2.5-coder:7b-instruct-q4_K_M',
  useLocalAI: false,
  selectedModelProfile: 'balanced',
}

const STORAGE_KEY = 'tryquest-ai-settings'

function getPersistedSettings(): typeof settingsStoreType.infer {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored)
      return defaultSettings

    const parsed = settingsStoreType(JSON.parse(stored))

    if (parsed instanceof type.errors) {
      console.error('Invalid AI settings state', parsed.summary)
      return defaultSettings
    }

    return parsed
  }
  catch {
    return defaultSettings
  }
}

export const aiSettingsStore = new Store<typeof settingsStoreType.infer>(
  getPersistedSettings(),
)

aiSettingsStore.subscribe((state) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.currentVal))
})

