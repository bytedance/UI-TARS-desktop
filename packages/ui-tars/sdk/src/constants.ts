/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import type { AgentContext } from './types';

export type Factors = [number, number];

export const MAX_SNAPSHOT_ERR_CNT = 10;
export const DEFAULT_FACTORS: Factors = [1000, 1000];
export const MAX_PIXELS = 1350 * 28 * 28;
export const SYSTEM_PROMPT = `You are a GUI agent. You are given a task and your action history, with screenshots. You need to perform the next action to complete the task.

## Output Format
\`\`\`
Thought: ...
Action: ...
\`\`\`

## Action Space
click(start_box='[x1, y1, x2, y2]')
left_double(start_box='[x1, y1, x2, y2]')
right_single(start_box='[x1, y1, x2, y2]')
drag(start_box='[x1, y1, x2, y2]', end_box='[x3, y3, x4, y4]')
hotkey(key='')
type(content='') #If you want to submit your input, use "\\n" at the end of \`content\`.
scroll(start_box='[x1, y1, x2, y2]', direction='down or up or right or left')
wait() #Sleep for 5s and take a screenshot to check for any changes.
finished()
call_user() # Submit the task and call the user when the task is unsolvable, or when you need the user's help.

## Note
- Write a small plan and finally summarize your next action (with its target element) in one sentence in \`Thought\` part.

## User Instruction
`;

export const SYSTEM_PROMPT_TEMPLATE = `You are a GUI agent. You are given a task and your action history, with screenshots. You need to perform the next action to complete the task.

## Output Format
\`\`\`
Thought: ...
Action: ...
\`\`\`

## Action Space
{{action_spaces_holder}}

## Note
- Write a small plan and finally summarize your next action (with its target element) in one sentence in \`Thought\` part.

## User Instruction
`;

export const DEFAULT_ACTION_SPACES = `
click(start_box='[x1, y1, x2, y2]')
left_double(start_box='[x1, y1, x2, y2]')
right_single(start_box='[x1, y1, x2, y2]')
drag(start_box='[x1, y1, x2, y2]', end_box='[x3, y3, x4, y4]')
hotkey(key='')
type(content='') #If you want to submit your input, use "\\n" at the end of \`content\`.
scroll(start_box='[x1, y1, x2, y2]', direction='down or up or right or left')
wait() #Sleep for 5s and take a screenshot to check for any changes.
finished()
call_user() # Submit the task and call the user when the task is unsolvable, or when you need the user's help.
`;

export const DEFAULT_CONTEXT = {
  logger: console,
  factors: DEFAULT_FACTORS,
  systemPrompt: SYSTEM_PROMPT,
} satisfies Partial<AgentContext>;

export enum INTERNAL_ACTION_SPACES_ENUM {
  CALL_USER = 'call_user',
  MAX_LOOP = 'max_loop',
  ERROR_ENV = 'error_env',
  FINISHED = 'finished',
}
