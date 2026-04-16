/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import type { CompletionPolicy } from './types';

type HistoryMessage = {
  from: 'gpt' | 'human';
  value: string;
};

function resolveCompletionRule(policy: CompletionPolicy): string {
  switch (policy) {
    case 'stop_after_content_action':
      return '- Continue until the requested content action is complete, such as entering text, sending, or replying.';
    case 'stop_on_target_open':
      return '- Finish as soon as the requested target interface opens. Do not type, send, or continue deeper unless the instruction explicitly asks for it.';
    case 'stop_on_page_arrival':
    default:
      return '- Finish as soon as the target page is confirmed.';
  }
}

export function buildNavigationGoalPrompt(targetPageName: string): string {
  return [
    '## Navigation Goal',
    `Target Page: ${targetPageName}`,
    '- Your only goal in this stage is to navigate to the target page.',
    '- Stop only after you have at least two independent signals that the target page is active.',
    '- Independent signals can include the target page label, a page signature text, or target-specific page content.',
    '- Confirm the target page across two consecutive screenshots before finishing.',
    '- After the first likely arrival, wait for one more screenshot and confirm the target page is still active.',
    '- If the page is not confirmed after the extra check, continue navigating instead of finishing early.',
  ].join('\n');
}

export function buildOnPageActionPrompt(
  targetPageName: string,
  remainingInstruction: string,
  completionPolicy: Exclude<CompletionPolicy, 'stop_on_page_arrival'>,
): string {
  return [
    '## Current Page Anchor',
    `You are already on the target page: ${targetPageName}.`,
    `Remaining Task: ${remainingInstruction}`,
    '- Focus only on the remaining on-page action.',
    '- Do not switch tabs, reopen navigation, or leave the current page unless the user explicitly asks for it.',
    '- Choose the single best candidate for the remaining task instead of sampling multiple similar targets.',
    resolveCompletionRule(completionPolicy),
    '- Do not repeat the same click when the page has not meaningfully changed; choose a different candidate or call_user().',
    '- If the current screen no longer matches the target page, call_user() instead of guessing.',
  ].join('\n');
}

export function buildOnPageHistoryMessages(targetPageName: string): HistoryMessage[] {
  return [
    {
      from: 'human',
      value: `Navigation stage result: the target page ${targetPageName} has been reached.`,
    },
    {
      from: 'gpt',
      value: `Acknowledged. I will stay on ${targetPageName} and only perform the remaining on-page action.`,
    },
  ];
}
