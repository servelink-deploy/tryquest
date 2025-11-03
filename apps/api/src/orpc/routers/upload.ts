import { type } from 'arktype'
import { consola } from 'consola'
import { uploadImage } from '~/lib/storage'
import { authMiddleware, orpc } from '~/orpc'

const uploadImageInputType = type({
  base64: 'string',
  contentType: 'string',
})

/**
 * Upload une image en base64 vers S3/R2 et retourne l'URL publique
 */
export const uploadImageToStorage = orpc
  .use(authMiddleware)
  .input(uploadImageInputType)
  .handler(async ({ input, context }) => {
    try {
      // Extraire le base64 pur (sans le préfixe data:image/...)
      const base64Data = input.base64.includes(',')
        ? input.base64.split(',')[1]
        : input.base64

      if (!base64Data) {
        throw new Error('Invalid base64 data')
      }

      const buffer = Buffer.from(base64Data, 'base64')

      const url = await uploadImage({
        buffer,
        contentType: input.contentType,
        userId: context.user.id,
      })

      consola.success(`Image uploaded for user ${context.user.email}: ${url}`)

      return { url }
    }
    catch (error) {
      consola.error('Failed to upload image', error)
      throw error
    }
  })

