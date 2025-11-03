import { SUPPORT_EMAIL } from '@conar/shared/constants'
import { type } from 'arktype'
import { consola } from 'consola'
import { sendRawEmail } from '~/lib/email'
import { authMiddleware, orpc } from '~/orpc'

export const contact = orpc
  .use(authMiddleware)
  .input(type({
    message: 'string',
  }))
  .handler(async ({ input, context }) => {
    try {
      // Envoi au support
      await sendRawEmail({
        to: SUPPORT_EMAIL,
        subject: `Contact request from ${context.user.email}`,
        html: `<p>From: ${context.user.email}</p><p>Message:<br>${input.message}</p>`,
      })

      // Confirmation à l'utilisateur
      await sendRawEmail({
        to: context.user.email,
        subject: 'Your contact request has been received by TryQuest',
        html: `<p>Hi ${context.user.name || context.user.email},</p><p>This is an automatic reply to let you know we received your message and will answer soon.</p>`,
      })

      consola.success('Support message sent successfully to both parties')
    }
    catch (error) {
      consola.error('Failed to send contact emails', error)
      throw error
    }
  })
