import type { ComponentProps } from 'react'
import { consola } from 'consola'
import { Resend } from 'resend'
import { env } from '~/env'
import { redis } from '~/lib/redis'
import { OnPasswordReset, ResetPassword } from '~/lib/email/templates'

const resend1 = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null
const resend2 = env.RESEND_API_KEY_2 ? new Resend(env.RESEND_API_KEY_2) : null

const DAILY_LIMIT = 100
const REDIS_KEY_PREFIX = 'resend:daily:'

async function getResendClient(): Promise<{ client: Resend | null, from: string }> {
  consola.info('Resend configuration:', {
    resend1Available: !!resend1,
    resend2Available: !!resend2,
    fromEmail1: env.RESEND_FROM_EMAIL,
    fromEmail2: env.RESEND_FROM_EMAIL_2,
    apiKey1Prefix: env.RESEND_API_KEY ? `${env.RESEND_API_KEY.substring(0, 10)}...` : 'not set',
    apiKey2Prefix: env.RESEND_API_KEY_2 ? `${env.RESEND_API_KEY_2.substring(0, 10)}...` : 'not set',
  })

  if (!resend1 && !resend2) {
    consola.warn('No Resend API keys configured')
    return { client: null, from: env.RESEND_FROM_EMAIL }
  }

  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  const key1 = `${REDIS_KEY_PREFIX}1:${today}`
  const key2 = `${REDIS_KEY_PREFIX}2:${today}`

  try {
    const [count1Str, count2Str] = await Promise.all([
      redis.get(key1),
      redis.get(key2),
    ])

    const count1 = count1Str ? Number.parseInt(count1Str, 10) : 0
    const count2 = count2Str ? Number.parseInt(count2Str, 10) : 0

    consola.info('Email counters:', {
      key1Count: count1,
      key2Count: count2,
      limit: DAILY_LIMIT,
    })

    // Priorité : clé 1 si disponible, sinon clé 2
    if (resend1 && count1 < DAILY_LIMIT) {
      consola.success(`Using primary Resend key (${env.RESEND_FROM_EMAIL}), count: ${count1}/${DAILY_LIMIT}`)
      return { client: resend1, from: env.RESEND_FROM_EMAIL }
    }

    if (resend2 && count2 < DAILY_LIMIT) {
      consola.success(`Switching to secondary Resend key (${env.RESEND_FROM_EMAIL_2}), count: ${count2}/${DAILY_LIMIT}`)
      return { client: resend2, from: env.RESEND_FROM_EMAIL_2! }
    }

    // Fallback si les deux limites atteintes
    consola.warn(`Both Resend API keys reached daily limit (${count1}/${DAILY_LIMIT}, ${count2}/${DAILY_LIMIT}), using primary as fallback`)
    return { client: resend1 || resend2, from: env.RESEND_FROM_EMAIL }
  }
  catch (error) {
    consola.error('Error checking Redis email counters, using primary key', error)
    return { client: resend1, from: env.RESEND_FROM_EMAIL }
  }
}

async function incrementEmailCount(from: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0]
  const keyIndex = from === env.RESEND_FROM_EMAIL ? '1' : '2'
  const key = `${REDIS_KEY_PREFIX}${keyIndex}:${today}`

  try {
    const count = await redis.incr(key)
    // Expire à minuit (86400s = 24h)
    if (count === 1) {
      await redis.expire(key, 86400)
    }
  }
  catch (error) {
    consola.error('Error incrementing Redis email counter', error)
  }
}

export const resend = resend1 // Export pour compatibilité

/**
 * Envoie un email brut (sans template React)
 */
export async function sendRawEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  const { client, from } = await getResendClient()

  if (!client) {
    consola.error('Resend email service is not configured.', {
      to,
      subject,
    })
    throw new Error('Resend email service is not configured')
  }

  try {
    consola.info(`Attempting to send raw email to ${to} via ${from}`, {
      subject,
    })

    const { error, data } = await client.emails.send({
      from: `TryQuest <${from}>`,
      to,
      subject,
      html,
    })

    if (error) {
      consola.error('Resend API error:', {
        error,
        from,
        to,
        subject,
      })
      throw error
    }

    // Incrémenter le compteur après envoi réussi
    await incrementEmailCount(from)

    consola.success(`✅ Raw email sent successfully via ${from} to ${to}`, {
      emailId: data?.id,
    })

    return data
  }
  catch (error) {
    consola.error('Failed to send raw email:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      from,
      to,
      subject,
    })

    throw error
  }
}

const templates = {
  ResetPassword,
  OnPasswordReset,
} as const

export async function sendEmail<
  T extends keyof typeof templates,
  P extends ComponentProps<typeof templates[T]>,
>({
  to,
  subject,
  template,
  props,
}: {
  to: string
  subject: string
  template: T
} & (keyof P extends never
  ? { props?: never }
  : { props: P })) {
  const { client, from } = await getResendClient()

  if (!client) {
    consola.error('Resend email service is not configured.', {
      to,
      subject,
      template,
    })
    return
  }

  try {
    consola.info(`Attempting to send email to ${to} via ${from}`, {
      template,
      subject,
    })

    const Template = templates[template] as (props?: P) => React.ReactElement
    const { error, data } = await client.emails.send({
      from: `TryQuest <${from}>`,
      to,
      subject,
      react: Template(props),
    })

    if (error) {
      consola.error('Resend API error:', {
        error,
        from,
        to,
        subject,
      })
      throw error
    }

    // Incrémenter le compteur après envoi réussi
    await incrementEmailCount(from)

    consola.success(`✅ Email sent successfully via ${from} to ${to}`, {
      emailId: data?.id,
    })
  }
  catch (error) {
    consola.error('Failed to send email:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      from,
      to,
      subject,
      template,
    })

    throw new Error('Unknown error occurred while sending email')
  }
}
