import { generateText } from 'ai'
import { type } from 'arktype'
import { getAIModel } from '~/lib/ai-models'
import { authMiddleware, orpc } from '~/orpc'
import { getMessages } from './ask'

export const enhancePrompt = orpc
  .use(authMiddleware)
  .input(type({
    prompt: 'string',
    chatId: 'string.uuid.v7',
  }))
  .handler(async ({ input, signal, context }) => {
    const messages = await getMessages(input.chatId)

    const model = await getAIModel('gpt-4o-mini', {
      userId: context.user.id,
      chatId: input.chatId,
      prompt: input.prompt,
    }, context.user.secret)

    const { text } = await generateText({
      model,
      messages: [
        {
          role: 'system',
          content: [
            'You are an expert at rewriting and clarifying user prompts. Your task is to rewrite the user\'s prompt to be as clear, specific, and unambiguous as possible.',
            '- Fix typos and grammar mistakes if needed.',
            '- If the prompt is already clear and specific, return it as is.',
            '- Do not add any explanations, greetings, or extra text, return only the improved prompt.',
            '- Make the prompt concise, actionable, and easy for an AI to generate the correct answer.',
            '- The prompt may be related to SQL.',
            '- Do not invent or assume any information that is not present in the original prompt or chat messages.',
            '- Do not add details, context, or requirements that are not explicitly stated by the user.',
            '- If the prompt is already clear and specific, make minimal changes',
            '- Maintain the user\'s original tone and intent',
            '',
            'Context from current chat conversation:',
            JSON.stringify(messages, null, 2),
            '',
            'Please rewrite the following user prompt to be more effective:',
          ].join('\n'),
        },
        {
          role: 'user',
          content: input.prompt,
        },
      ],
      abortSignal: signal,
    })

    return text
  })
