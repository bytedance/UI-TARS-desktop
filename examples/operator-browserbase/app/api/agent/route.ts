/*
 * Copyright (c) 2025 browserbase and its affiliates.
 * SPDX-License-Identifier: MIT
 */
import { NextResponse } from 'next/server';
import { GUIAgent, StatusEnum } from '@ui-tars/sdk';
import { BrowserbaseOperator } from '@ui-tars/operator-browserbase';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Request rate limiting map: tracks requests per API key
const requestRateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;

// Request body schema validation
const AgentRequestSchema = z.object({
  goal: z.string().min(1).max(5000),
  sessionId: z.string().min(1).max(256),
});

type AgentRequest = z.infer<typeof AgentRequestSchema>;

/**
 * Verify API authentication via Authorization header
 * SECURITY: Requires valid authorization token to prevent unauthorized access
 */
function verifyAuthentication(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7);
  const expectedToken = process.env.AGENT_API_SECRET;
  if (!expectedToken || token !== expectedToken) {
    return null;
  }
  return token;
}

/**
 * Check rate limiting for the request
 * SECURITY: Prevents abuse by limiting requests per authentication token
 */
function checkRateLimit(apiKey: string): boolean {
  const now = Date.now();
  const record = requestRateLimitMap.get(apiKey);
  
  if (!record || now >= record.resetTime) {
    requestRateLimitMap.set(apiKey, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  
  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  
  record.count++;
  return true;
}

/**
 * Structured logging for security audit trail
 * SECURITY: Provides comprehensive audit logs for forensic analysis
 */
function logSecurityEvent(
  eventType: string,
  clientIp: string | null,
  userId: string | null,
  details: Record<string, unknown>,
) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    eventType,
    clientIp: clientIp || 'unknown',
    userId: userId || 'unauthenticated',
    ...details,
  };
  console.log(JSON.stringify(logEntry));
}

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
  
  // Extract client IP for logging (SECURITY: for audit trail)
  const clientIp = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown';

  try {
    // SECURITY: Verify authentication before processing
    const apiToken = verifyAuthentication(request);
    if (!apiToken) {
      logSecurityEvent('auth_failed', clientIp, null, { reason: 'missing_or_invalid_token' });
      return NextResponse.json(
        { error: 'Unauthorized: Missing or invalid authorization token' },
        { status: 401 },
      );
    }

    // SECURITY: Check rate limiting
    if (!checkRateLimit(apiToken)) {
      logSecurityEvent('rate_limit_exceeded', clientIp, apiToken, {});
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 },
      );
    }

    // SECURITY: Validate request body schema
    let parsedBody: AgentRequest;
    try {
      const body = await request.json();
      parsedBody = AgentRequestSchema.parse(body);
    } catch (error) {
      logSecurityEvent('validation_failed', clientIp, apiToken, { 
        error: error instanceof Error ? error.message : 'Invalid request body' 
      });
      return NextResponse.json(
        { error: 'Invalid request body: goal and sessionId are required' },
        { status: 400 },
      );
    }

    const { goal, sessionId } = parsedBody;
    logSecurityEvent('request_accepted', clientIp, apiToken, { goal: goal.substring(0, 100) });

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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logSecurityEvent('processing_error', clientIp, null, { error: errorMessage });
    console.error('Error in agent endpoint:', error);
    writer.write(encoder.encode(JSON.stringify({ error: 'Internal server error' })));
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
