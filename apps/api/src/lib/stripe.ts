import Stripe from 'stripe'
import { env } from '~/env'

export const stripe = new Stripe(env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
  appInfo: {
    name: 'TryQuest',
    url: env.WEB_URL,
  },
})
