import { DatabaseType } from '@conar/shared/enums/database-type'
import { generateText } from 'ai'
import { type } from 'arktype'
import { getAIModel } from '~/lib/ai-models'
import { authMiddleware, orpc } from '~/orpc'

export const fixSQL = orpc
  .use(authMiddleware)
  .input(type({
    sql: 'string',
    error: 'string',
    type: type.valueOf(DatabaseType),
  }))
  .handler(async ({ input, signal, context }) => {
    const model = await getAIModel('claude-sonnet-4-5', {
      userId: context.user.id,
    }, context.user.secret)

    const { text } = await generateText({
      model,
      abortSignal: signal,
      messages: [
        {
          role: 'system',
          content: [
            'You are an expert at fixing SQL queries based on the error message.',
            '- Fix the SQL query to be valid and correct.',
            `- The database type is "${input.type}".`,
            '- Preserve the same format and styling.',
            '- Return only the fixed SQL query, do not add any explanations, greetings, or extra text.',
            '- If the SQL query is already valid and correct, return it as is. Do not add any changes.',
          ].join('\n'),
        },
        {
          role: 'user',
          content: [
            '=======SQL QUERY=======',
            input.sql,
            '=======END OF SQL QUERY=======',
          ].join('\n'),
        },
      ],
    })

    return text
  })
