import { createOpenAI } from '@ai-sdk/openai'
import { aiSettingsStore } from './settings-store'

const OLLAMA_BASE_URL = 'http://127.0.0.1:11434/v1'
const DEFAULT_MODEL = 'qwen2.5-coder:7b-instruct-q4_K_M'

export function createLocalLLM(modelName?: string) {
  const ollama = createOpenAI({
    baseURL: OLLAMA_BASE_URL,
    apiKey: 'ollama', // Ollama ne nécessite pas de vraie clé API
  })

  // Utiliser le modèle configuré par l'utilisateur ou le modèle par défaut
  const selectedModel = modelName || aiSettingsStore.state.defaultLocalModel || DEFAULT_MODEL

  return ollama(selectedModel)
}

export { DEFAULT_MODEL }

