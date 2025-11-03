import type { RouterClient } from '@orpc/server'
import { orpc } from '..'
import { ai } from './ai'
import { chats } from './chats'
import { chatsMessages } from './chats-messages'
import { contact } from './contact'
import { databases } from './databases'
import { proxy } from './proxy'
import { queries } from './queries'
import { uploadImageToStorage } from './upload'
import { deleteUserApiKeys, getUserApiKeys, updateUserApiKeys } from './user-api-keys'

export const router = orpc.router({
  contact,
  ai,
  chats,
  chatsMessages,
  queries,
  databases,
  proxy,
  uploadImageToStorage,
  userApiKeys: orpc.router({
    getUserApiKeys,
    updateUserApiKeys,
    deleteUserApiKeys,
  }),
})

export type ORPCRouter = RouterClient<typeof router>
