import { relations } from 'drizzle-orm'
import { index, pgTable, text, uuid } from 'drizzle-orm/pg-core'
import { baseTable } from '../base-table'
import { users } from './auth'

export const userApiKeys = pgTable('user_api_keys', {
  ...baseTable,
  userId: uuid()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  // Clés chiffrées avec le secret utilisateur
  openaiApiKey: text(), // Chiffré
  anthropicApiKey: text(), // Chiffré
  googleApiKey: text(), // Chiffré
  xaiApiKey: text(), // Chiffré
}, t => [
  index().on(t.userId),
])

export const userApiKeysRelations = relations(userApiKeys, ({ one }) => ({
  user: one(users, {
    fields: [userApiKeys.userId],
    references: [users.id],
  }),
}))


