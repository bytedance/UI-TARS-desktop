import { OpenAI } from 'openai'
import { v4 as uuidv4 } from 'uuid'
import type { Message, ToolCall, ToolResult } from '@/lib/types'
import { getToolDefinitions, executeTool } from '@/lib/tools/registry'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const body = await request.json()
  const { messages } = body as { messages: Message[] }

  // Get settings from request headers or use defaults
  const apiBaseUrl = request.headers.get('x-api-base-url') || process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1'
  const apiKey = request.headers.get('x-api-key') || process.env.OPENAI_API_KEY || ''
  const model = request.headers.get('x-model') || 'gpt-4o'
  const temperature = parseFloat(request.headers.get('x-temperature') || '0.7')
  const maxTokens = parseInt(request.headers.get('x-max-tokens') || '4096')

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'API key not configured' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const openai = new OpenAI({
    apiKey,
    baseURL: apiBaseUrl,
  })

  // Convert messages to OpenAI format
  const openaiMessages = messages.map((msg) => {
    if (typeof msg.content === 'string') {
      return {
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      }
    }
    // Handle multimodal content
    return {
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content.map((part) => {
        if (part.type === 'text') {
          return { type: 'text' as const, text: part.text }
        }
        return {
          type: 'image_url' as const,
          image_url: part.image_url,
        }
      }),
    }
  })

  // Get available tools
  const tools = getToolDefinitions()

  // Create streaming response
  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  const sendEvent = async (data: Record<string, unknown>) => {
    await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
  }

  // Process in background
  ;(async () => {
    try {
      let currentMessages = [...openaiMessages]
      let continueLoop = true

      while (continueLoop) {
        const response = await openai.chat.completions.create({
          model,
          messages: currentMessages,
          temperature,
          max_tokens: maxTokens,
          tools: tools.length > 0 ? tools : undefined,
          stream: true,
        })

        let contentBuffer = ''
        let toolCalls: OpenAI.Chat.ChatCompletionChunk.Choice.Delta.ToolCall[] = []
        let finishReason: string | null = null

        for await (const chunk of response) {
          const choice = chunk.choices[0]
          if (!choice) continue

          const delta = choice.delta

          // Handle content
          if (delta.content) {
            contentBuffer += delta.content
            await sendEvent({ type: 'content', content: delta.content })
          }

          // Handle tool calls
          if (delta.tool_calls) {
            for (const toolCallDelta of delta.tool_calls) {
              const index = toolCallDelta.index
              
              if (!toolCalls[index]) {
                toolCalls[index] = {
                  index,
                  id: toolCallDelta.id || '',
                  type: 'function',
                  function: {
                    name: toolCallDelta.function?.name || '',
                    arguments: toolCallDelta.function?.arguments || '',
                  },
                }
              } else {
                if (toolCallDelta.function?.arguments) {
                  toolCalls[index].function!.arguments += toolCallDelta.function.arguments
                }
              }
            }
          }

          finishReason = choice.finish_reason
        }

        // Handle tool calls if any
        if (finishReason === 'tool_calls' && toolCalls.length > 0) {
          // Send tool calls to client
          for (const tc of toolCalls) {
            if (tc.id && tc.function?.name) {
              await sendEvent({
                type: 'tool_call',
                toolCall: {
                  id: tc.id,
                  type: 'function',
                  function: {
                    name: tc.function.name,
                    arguments: tc.function.arguments,
                  },
                },
              })
            }
          }

          // Execute tools
          const toolResults: ToolResult[] = []
          for (const tc of toolCalls) {
            if (!tc.id || !tc.function?.name) continue

            const startTime = Date.now()
            let result: unknown
            let isError = false

            try {
              const args = JSON.parse(tc.function.arguments || '{}')
              result = await executeTool(tc.function.name, args)
            } catch (error) {
              result = { error: (error as Error).message }
              isError = true
            }

            const duration = Date.now() - startTime

            const toolResult: ToolResult = {
              toolCallId: tc.id,
              toolName: tc.function.name,
              result,
              isError,
              duration,
            }

            toolResults.push(toolResult)

            await sendEvent({
              type: 'tool_result',
              toolResult,
            })
          }

          // Add assistant message with tool calls
          currentMessages.push({
            role: 'assistant',
            content: contentBuffer || null,
            tool_calls: toolCalls.map((tc) => ({
              id: tc.id!,
              type: 'function' as const,
              function: {
                name: tc.function!.name!,
                arguments: tc.function!.arguments!,
              },
            })),
          } as any)

          // Add tool results
          for (const tr of toolResults) {
            currentMessages.push({
              role: 'tool',
              tool_call_id: tr.toolCallId,
              content: typeof tr.result === 'string' ? tr.result : JSON.stringify(tr.result),
            } as any)
          }

          // Continue the loop to get final response
        } else {
          // No more tool calls, end the loop
          continueLoop = false
          await sendEvent({ type: 'done', finishReason })
        }
      }
    } catch (error) {
      console.error('Error in message processing:', error)
      await sendEvent({
        type: 'error',
        error: (error as Error).message,
      })
    } finally {
      await writer.close()
    }
  })()

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
