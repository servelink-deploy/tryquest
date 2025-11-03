import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { consola } from 'consola'
import { nanoid } from 'nanoid'
import { env } from '~/env'

/**
 * Client S3 compatible (AWS S3, Cloudflare R2, MinIO, etc.)
 */
let s3Client: S3Client | null = null

function getS3Client(): S3Client | null {
  if (!env.S3_ENDPOINT || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
    consola.warn('S3 storage is not configured. Images will be stored as base64 (not recommended for production).')
    return null
  }

  if (!s3Client) {
    s3Client = new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: 'auto', // Cloudflare R2 uses 'auto'
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
    })
  }

  return s3Client
}

export interface UploadImageOptions {
  buffer: Buffer
  contentType: string
  userId: string
}

/**
 * Upload une image vers S3/R2 et retourne l'URL publique
 */
export async function uploadImage({ buffer, contentType, userId }: UploadImageOptions): Promise<string> {
  const client = getS3Client()

  if (!client || !env.S3_BUCKET_NAME || !env.S3_PUBLIC_URL) {
    // Fallback: retourner en base64 si S3 n'est pas configuré
    consola.warn('S3 not configured, falling back to base64')
    const base64 = buffer.toString('base64')
    return `data:${contentType};base64,${base64}`
  }

  // Générer un nom de fichier unique
  const ext = contentType.split('/')[1] || 'png'
  const filename = `chat-images/${userId}/${nanoid()}.${ext}`

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET_NAME,
        Key: filename,
        Body: buffer,
        ContentType: contentType,
      }),
    )

    // Retourner l'URL publique
    const publicUrl = `${env.S3_PUBLIC_URL}/${filename}`
    consola.success(`Image uploaded successfully: ${publicUrl}`)

    return publicUrl
  }
  catch (error) {
    consola.error('Failed to upload image to S3', error)
    throw new Error('Failed to upload image')
  }
}

/**
 * Vérifie si le storage S3 est configuré
 */
export function isStorageConfigured(): boolean {
  return !!(
    env.S3_ENDPOINT
    && env.S3_ACCESS_KEY_ID
    && env.S3_SECRET_ACCESS_KEY
    && env.S3_BUCKET_NAME
    && env.S3_PUBLIC_URL
  )
}

