import { type } from 'arktype'
import { consola } from 'consola'
import { eq } from 'drizzle-orm'
import { db, userApiKeys } from '~/drizzle'
import { decrypt, encrypt } from '~/drizzle/utils'
import { authMiddleware, orpc } from '~/orpc'

const apiKeysInputType = type({
  'openaiApiKey?': 'string',
  'anthropicApiKey?': 'string',
  'googleApiKey?': 'string',
  'xaiApiKey?': 'string',
})

export const getUserApiKeys = orpc
  .use(authMiddleware)
  .handler(async ({ context }) => {
    const [keys] = await db
      .select()
      .from(userApiKeys)
      .where(eq(userApiKeys.userId, context.user.id))
      .limit(1)

    if (!keys) {
      return {
        openaiApiKey: null,
        anthropicApiKey: null,
        googleApiKey: null,
        xaiApiKey: null,
      }
    }

    // Déchiffrer les clés
    const secret = context.user.secret
    return {
      openaiApiKey: keys.openaiApiKey ? await decrypt(keys.openaiApiKey, secret) : null,
      anthropicApiKey: keys.anthropicApiKey ? await decrypt(keys.anthropicApiKey, secret) : null,
      googleApiKey: keys.googleApiKey ? await decrypt(keys.googleApiKey, secret) : null,
      xaiApiKey: keys.xaiApiKey ? await decrypt(keys.xaiApiKey, secret) : null,
    }
  })

export const updateUserApiKeys = orpc
  .use(authMiddleware)
  .input(apiKeysInputType)
  .handler(async ({ input, context }) => {
    const secret = context.user.secret

    // Chiffrer les clés fournies
    const encryptedKeys: Record<string, string | null> = {}

    if (input.openaiApiKey !== undefined) {
      encryptedKeys.openaiApiKey = input.openaiApiKey ? await encrypt(input.openaiApiKey, secret) : null
    }
    if (input.anthropicApiKey !== undefined) {
      encryptedKeys.anthropicApiKey = input.anthropicApiKey ? await encrypt(input.anthropicApiKey, secret) : null
    }
    if (input.googleApiKey !== undefined) {
      encryptedKeys.googleApiKey = input.googleApiKey ? await encrypt(input.googleApiKey, secret) : null
    }
    if (input.xaiApiKey !== undefined) {
      encryptedKeys.xaiApiKey = input.xaiApiKey ? await encrypt(input.xaiApiKey, secret) : null
    }

    // Vérifier si l'entrée existe
    const [existing] = await db
      .select({ id: userApiKeys.id })
      .from(userApiKeys)
      .where(eq(userApiKeys.userId, context.user.id))
      .limit(1)

    if (existing) {
      // Update
      await db
        .update(userApiKeys)
        .set(encryptedKeys)
        .where(eq(userApiKeys.userId, context.user.id))

      consola.success(`Updated API keys for user ${context.user.email}`)
    }
    else {
      // Insert
      await db.insert(userApiKeys).values({
        userId: context.user.id,
        ...encryptedKeys,
      })

      consola.success(`Created API keys for user ${context.user.email}`)
    }

    return { success: true }
  })

export const deleteUserApiKeys = orpc
  .use(authMiddleware)
  .handler(async ({ context }) => {
    await db
      .delete(userApiKeys)
      .where(eq(userApiKeys.userId, context.user.id))

    consola.success(`Deleted API keys for user ${context.user.email}`)

    return { success: true }
  })


