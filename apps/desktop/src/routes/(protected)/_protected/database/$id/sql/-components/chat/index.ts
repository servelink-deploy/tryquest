import type { AppUIMessage, tools } from '@conar/shared/ai-tools'
import type { InferToolInput, InferToolOutput } from 'ai'
import type { chatsMessages, databases } from '~/drizzle'
import { Chat } from '@ai-sdk/react'
import { streamText } from 'ai'
import { convertToAppUIMessage, tools as aiTools } from '@conar/shared/ai-tools'
import { SQL_FILTERS_LIST } from '@conar/shared/filters/sql'
import { eventIteratorToStream } from '@orpc/client'
import { lastAssistantMessageIsCompleteWithToolCalls } from 'ai'
import { v7 as uuid } from 'uuid'
import { chatsCollection, chatsMessagesCollection } from '~/entities/chat'
import { databaseEnumsQuery, databaseTableColumnsQuery, rowsSql, tablesAndSchemasQuery } from '~/entities/database'
import { createLocalLLM } from '~/lib/ai/local-llm'
import { aiSettingsStore } from '~/lib/ai/settings-store'
import { orpc } from '~/lib/orpc'
import { queryClient } from '~/main'
import { databaseStore } from '../../../../-store'

export * from './chat'

function ensureChat(chatId: string, databaseId: string) {
  const existingChat = chatsCollection.get(chatId)

  if (existingChat) {
    return existingChat
  }

  chatsCollection.insert({
    id: chatId,
    databaseId,
    title: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  return chatsCollection.get(chatId)!
}

const chatsMap = new Map<string, Chat<AppUIMessage>>()

export async function createChat({ id = uuid(), database }: { id?: string, database: typeof databases.$inferSelect }) {
  if (chatsMap.has(id)) {
    return chatsMap.get(id)!
  }

  const chat = new Chat<AppUIMessage>({
    id,
    generateId: uuid,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    transport: {
      async sendMessages(options): Promise<any> {
        const lastMessage = options.messages.at(-1)

        if (!lastMessage) {
          throw new Error('Last message not found')
        }

        if (options.trigger === 'regenerate-message' && !options.messageId) {
          options.messageId = lastMessage.id
        }

        const chat = ensureChat(options.chatId, database.id)

        if (options.trigger === 'submit-message') {
          const existingMessage = chatsMessagesCollection.get(lastMessage.id)

          const updatedAt = new Date()
          if (existingMessage) {
            chatsMessagesCollection.update(lastMessage.id, (draft) => {
              Object.assign(draft, {
                ...lastMessage,
                chatId: options.chatId,
                updatedAt,
                metadata: {
                  ...existingMessage.metadata,
                  updatedAt,
                },
              } satisfies typeof chatsMessages.$inferInsert)
            })
          }
          else {
            const createdAt = new Date()
            chatsMessagesCollection.insert({
              ...lastMessage,
              chatId: options.chatId,
              createdAt,
              updatedAt,
              metadata: {
                createdAt,
                updatedAt,
              },
            })
          }
        }

        if (options.trigger === 'regenerate-message' && options.messageId) {
          chatsMessagesCollection.delete(options.messageId)
        }

        const store = databaseStore(database.id)
        const useLocalAI = aiSettingsStore.state.useLocalAI

        // Context pour l'IA
        const context = [
          `Current query in the SQL runner: ${store.state.sql.trim() || 'Empty'}`,
          'Database schemas and tables:',
          JSON.stringify(await queryClient.ensureQueryData(tablesAndSchemasQuery({ database })), null, 2),
        ].join('\n')

        // Si l'utilisateur utilise l'IA locale
        if (useLocalAI && window.electron) {
          try {
            // S'assurer qu'Ollama tourne
            await window.electron.ollama.ensureRunning()

            const model = createLocalLLM()

            // Construire le système prompt et les messages
            const systemPrompt = `You are a SQL assistant helping users with their database queries.

Context:
${context}

You have access to tools to query the database. Use them to help the user.`

            const messages = options.messages.map((msg) => {
              // Extraire le contenu textuel du message
              let textContent = ''
              if (msg.role === 'user' || msg.role === 'assistant') {
                if ('parts' in msg && Array.isArray(msg.parts)) {
                  const textPart = msg.parts.find(p => p.type === 'text')
                  textContent = textPart ? (textPart as any).text : ''
                }
              }

              if (msg.role === 'user') {
                return {
                  role: 'user' as const,
                  content: textContent,
                }
              }
              return {
                role: 'assistant' as const,
                content: textContent,
              }
            })

            const result = await streamText({
              model,
              system: systemPrompt,
              messages,
              tools: aiTools,
              abortSignal: options.abortSignal,
            })

            return result.toTextStreamResponse().body!
          }
          catch (error) {
            console.error('Local AI inference failed, falling back to cloud:', error)
            // Fallback sur l'API cloud en cas d'erreur
          }
        }

        // Mode cloud (par défaut ou fallback)
        return eventIteratorToStream(await orpc.ai.ask({
          ...options.body,
          id: options.chatId,
          createdAt: chat.createdAt,
          updatedAt: chat.updatedAt,
          type: database.type,
          databaseId: database.id,
          prompt: lastMessage,
          trigger: options.trigger,
          messageId: options.messageId,
          context,
        }, { signal: options.abortSignal }))
      },
      reconnectToStream() {
        throw new Error('Unsupported')
      },
    },
    messages: (await chatsMessagesCollection.toArrayWhenReady())
      .filter(m => m.chatId === id)
      .toSorted((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(convertToAppUIMessage),
    onFinish: ({ message }) => {
      const existingMessage = chatsMessagesCollection.get(message.id)

      if (existingMessage) {
        chatsMessagesCollection.update(message.id, (draft) => {
          Object.assign(draft, {
            ...message,
            createdAt: message.metadata?.createdAt || new Date(),
            updatedAt: message.metadata?.updatedAt || new Date(),
          })
        })
      }
      else {
        chatsMessagesCollection.insert({
          ...message,
          chatId: id,
          createdAt: message.metadata?.createdAt || new Date(),
          updatedAt: message.metadata?.updatedAt || new Date(),
          metadata: null,
        })
      }
    },
    onToolCall: async ({ toolCall }) => {
      if (toolCall.toolName === 'columns') {
        const input = toolCall.input as InferToolInput<typeof tools.columns>
        const output = await queryClient.ensureQueryData(databaseTableColumnsQuery({
          database,
          table: input.tableAndSchema.tableName,
          schema: input.tableAndSchema.schemaName,
        })) satisfies InferToolOutput<typeof tools.columns>

        chat.addToolResult({
          tool: 'columns',
          toolCallId: toolCall.toolCallId,
          output,
        })
      }
      else if (toolCall.toolName === 'enums') {
        const output = await queryClient.ensureQueryData(databaseEnumsQuery({ database })).then(results => results.flatMap(r => r.values.map(v => ({
          schema: r.schema,
          name: r.name,
          value: v,
        })))) satisfies InferToolOutput<typeof tools.enums>

        chat.addToolResult({
          tool: 'enums',
          toolCallId: toolCall.toolCallId,
          output,
        })
      }
      else if (toolCall.toolName === 'select') {
        const input = toolCall.input as InferToolInput<typeof tools.select>
        const output = await rowsSql(database, {
          schema: input.tableAndSchema.schemaName,
          table: input.tableAndSchema.tableName,
          limit: input.limit,
          offset: input.offset,
          orderBy: input.orderBy,
          select: input.select,
          // To save back compatibility with the old filters
          filters: input.whereFilters.map((filter) => {
            const operator = SQL_FILTERS_LIST.find(f => f.operator === filter.operator)

            if (!operator) {
              throw new Error(`Invalid operator: ${filter.operator}`)
            }

            return {
              column: filter.column,
              ref: operator,
              values: filter.values,
            }
          }),
          filtersConcatOperator: input.whereConcatOperator,
        }).catch(error => ({
          error: error instanceof Error ? error.message : 'Error during the query execution',
        })) satisfies InferToolOutput<typeof tools.select>

        chat.addToolResult({
          tool: 'select',
          toolCallId: toolCall.toolCallId,
          output,
        })
      }
    },
  })

  chatsMap.set(id, chat)

  return chat
}
