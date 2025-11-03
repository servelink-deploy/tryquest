import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import type { LanguageModelV2 } from '@ai-sdk/provider'
import { createXai } from '@ai-sdk/xai'
import { eq } from 'drizzle-orm'
import { db, userApiKeys } from '~/drizzle'
import { decrypt } from '~/drizzle/utils'
import { env } from '~/env'
import { withPosthog } from './posthog'

export type AIProvider = 'openai' | 'anthropic' | 'google' | 'xai'

interface AIModelOptions {
  userId: string
  provider?: AIProvider
  [key: string]: string | number | boolean | undefined
}

/**
 * Récupère les clés API d'un utilisateur (déchiffrées)
 */
async function getUserApiKeys(userId: string, userSecret: string) {
  const [keys] = await db
    .select()
    .from(userApiKeys)
    .where(eq(userApiKeys.userId, userId))
    .limit(1)

  if (!keys) {
    return null
  }

  return {
    openaiApiKey: keys.openaiApiKey ? await decrypt(keys.openaiApiKey, userSecret) : null,
    anthropicApiKey: keys.anthropicApiKey ? await decrypt(keys.anthropicApiKey, userSecret) : null,
    googleApiKey: keys.googleApiKey ? await decrypt(keys.googleApiKey, userSecret) : null,
    xaiApiKey: keys.xaiApiKey ? await decrypt(keys.xaiApiKey, userSecret) : null,
  }
}

/**
 * Crée un modèle AI avec priorité : clés utilisateur > clés système > Gemini par défaut
 */
export async function getAIModel(
  modelName: string,
  options: AIModelOptions,
  userSecret: string,
): Promise<LanguageModelV2> {
  const { userId, provider, ...posthogProps } = options

  // Récupérer les clés utilisateur
  const userKeys = await getUserApiKeys(userId, userSecret)

  let model: LanguageModelV2

  // Déterminer le provider basé sur le nom du modèle
  const detectedProvider = provider || detectProviderFromModel(modelName)

  switch (detectedProvider) {
    case 'openai': {
      const apiKey = userKeys?.openaiApiKey || env.OPENAI_API_KEY
      if (apiKey) {
        const openai = createOpenAI({ apiKey })
        model = openai(modelName)
      }
      else {
        // Fallback vers Gemini si pas de clé OpenAI
        const google = createGoogleGenerativeAI({
          apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY || userKeys?.googleApiKey || undefined,
        })
        model = google('gemini-2.0-flash')
      }
      break
    }

    case 'anthropic': {
      const apiKey = userKeys?.anthropicApiKey || env.ANTHROPIC_API_KEY
      if (apiKey) {
        const anthropic = createAnthropic({ apiKey })
        model = anthropic(modelName)
      }
      else {
        // Fallback vers Gemini
        const google = createGoogleGenerativeAI({
          apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY || userKeys?.googleApiKey || undefined,
        })
        model = google('gemini-2.0-flash')
      }
      break
    }

    case 'google': {
      const apiKey = userKeys?.googleApiKey || env.GOOGLE_GENERATIVE_AI_API_KEY
      const google = createGoogleGenerativeAI({ apiKey })
      model = google(modelName)
      break
    }

    case 'xai': {
      const apiKey = userKeys?.xaiApiKey || env.XAI_API_KEY
      if (apiKey) {
        const xai = createXai({ apiKey })
        model = xai(modelName)
      }
      else {
        // Fallback vers Gemini
        const google = createGoogleGenerativeAI({
          apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY || userKeys?.googleApiKey || undefined,
        })
        model = google('gemini-2.0-flash')
      }
      break
    }

    default:
      // Fallback par défaut vers Gemini
      const google = createGoogleGenerativeAI({
        apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY || userKeys?.googleApiKey || undefined,
      })
      model = google('gemini-2.0-flash')
  }

  // Wrapper PostHog
  return withPosthog(model, {
    userId,
    ...posthogProps,
  })
}

/**
 * Détecte le provider depuis le nom du modèle
 */
function detectProviderFromModel(modelName: string): AIProvider {
  if (modelName.startsWith('gpt-') || modelName.includes('openai')) {
    return 'openai'
  }
  if (modelName.startsWith('claude-') || modelName.includes('anthropic')) {
    return 'anthropic'
  }
  if (modelName.startsWith('gemini-') || modelName.includes('google')) {
    return 'google'
  }
  if (modelName.startsWith('grok-') || modelName.includes('xai')) {
    return 'xai'
  }
  return 'google' // Par défaut Gemini
}


