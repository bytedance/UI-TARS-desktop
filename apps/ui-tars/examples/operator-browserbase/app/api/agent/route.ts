/*
 * Copyright (c) 2025 browserbase and its affiliates.
 * SPDX-License-Identifier: MIT
 */
import { NextResponse } from 'next/server';
import { GUIAgent, StatusEnum } from '@ui-tars/sdk';
import { BrowserbaseOperator } from '@ui-tars/operator-browserbase';

export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `You are a GUI agent. You are given a task and your action history, with screenshots. You need to perform the next action to complete the task.

## Output Format
\`\`\`
Thought: ...
Action: ...
\`\`\`

## Action Space
${BrowserbaseOperator.MANUAL.ACTION_SPACES.join('\n')}

## Note
- The first step should be to GOTO a specific website
- Write a small plan and finally summarize your next action (with its target element) in one sentence in \`Thought\` part.

## Example
${BrowserbaseOperator.MANUAL.EXAMPLES.join('\n')}

## User Instruction
`;

export async function GET() {
  return NextResponse.json({ message: 'Agent API endpoint ready' });
}

export async function POST(request: Request) {
  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  try {
    console.log('request', request);
    const body = await request.json();
    const { goal, sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing sessionId in request body' },
        { status: 400 },
      );
    }

    console.log('sessionIdsessionIdsessionId', sessionId);
    const operator = new BrowserbaseOperator({
      // browserbaseSessionID: sessionId,
      env: 'LOCAL',
    });

    const guiAgent = new GUIAgent({
      systemPrompt: SYSTEM_PROMPT,
      model: {
        baseURL: process.env.UI_TARS_BASE_URL,
        apiKey: process.env.UI_TARS_API_KEY,
        model: process.env.UI_TARS_MODEL!,
      },
      // signal,
      operator,
      onData: async ({ data }) => {
        console.log('data', data);
        const [lastConversation] = data?.conversations || [];

        const steps =
          lastConversation?.predictionParsed &&
          lastConversation?.predictionParsed?.length > 0
            ? lastConversation?.predictionParsed?.map((p) => ({
                text: `${p.action_type}: ${JSON.stringify(p.action_inputs)}`,
                reasoning: p.thought,
                tool: p.action_type,
                instruction: p.action_inputs?.content,
              }))
            : [];

        const nextData = {
          success: true,
          ...(lastConversation?.from === 'gpt' &&
            lastConversation?.value && {
              reasoning: lastConversation.value,
            }),
          ...(steps.length > 0 && { steps, result: steps[0] }),
          done: [StatusEnum.END, StatusEnum.MAX_LOOP].includes(data.status),
        };
        console.log('nextData', nextData);
        await writer.write(
          encoder.encode(`data: ${JSON.stringify(nextData)}\n\n`),
        );
        if (data.status === StatusEnum.END) {
          return writer.close();
        }
      },
      onError: ({ error }) => {
        writer.write(encoder.encode(`data: ${JSON.stringify({ error })}\n\n`));
      },
    });

    guiAgent.run(goal);
  } catch (error) {
    console.error('Error in agent endpoint:', error);
    writer.write(encoder.encode(JSON.stringify({ error })));
    writer.close();
  }

  return new NextResponse(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache, no-transform',
    },
  });
}
