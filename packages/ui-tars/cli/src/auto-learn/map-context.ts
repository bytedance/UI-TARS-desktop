/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import type { AppMap } from './types';

type HistoryMessage = {
  from: 'gpt' | 'human';
  value: string;
};

const MAX_TABS_IN_PROMPT = 8;
const MAX_PAGES_IN_PROMPT = 12;
const MAX_ROUTES_IN_PROMPT = 12;
const NAVIGATION_INTENT_PATTERN =
  /切换|进入|前往|去到|去往|跳转|返回|navigate|switch|go to|open/i;
const COMPOSITE_TASK_PATTERN =
  /然后|之后|再|并且|并|同时|后|and then|then|after/i;
const PAGE_INTERACTION_PATTERN =
  /第一条|第一個|第一项|第一张|第一個會話|第一個会话|第一项会话|会话|對話|对话|conversation|chat|详情|detail|按钮|button|输入|type|card|列表项|卡片/i;

function formatTabs(map: AppMap): string[] {
  return map.navigation.tabs
    .slice(0, MAX_TABS_IN_PROMPT)
    .map((tab) => `- Tab ${tab.index}: ${tab.name}`);
}

function formatPages(map: AppMap): string[] {
  return Object.keys(map.pages)
    .slice(0, MAX_PAGES_IN_PROMPT)
    .map((pageName) => {
      const page = map.pages[pageName];
      const layout = page?.layout || 'unknown';
      const regionCount = page?.regions.length || 0;
      return `- ${pageName} (layout: ${layout}, regions: ${regionCount})`;
    });
}

function formatRoutes(map: AppMap): string[] {
  return Object.entries(map.navigationGraph)
    .flatMap(([source, targets]) =>
      targets.map((target) => `- ${source} -> ${target}`),
    )
    .slice(0, MAX_ROUTES_IN_PROMPT);
}

function splitCompositeQuery(query: string): string[] {
  return query
    .split(/然后|之后|并且|同时|and then|then|after/i)
    .map((segment) => segment.trim().replace(/^[,，。、；;\s]+|[,，。、；;\s]+$/g, ''))
    .filter(Boolean);
}

function getKnownTargets(map: AppMap): string[] {
  return Array.from(
    new Set([
      ...map.navigation.tabs.map((tab) => tab.name),
      ...Object.keys(map.pages),
    ]),
  );
}

export function buildAppMapContextPrompt(map: AppMap): string {
  const sections = [
    '## App Map Context',
    'Use this learned app map as a navigation prior. Prefer known tabs, pages, and routes before guessing from pixels alone.',
    '',
    `App: ${map.meta.appName}`,
    `Package: ${map.meta.package}`,
  ];

  const tabs = formatTabs(map);
  if (tabs.length > 0) {
    sections.push('', '### Known Navigation Items', ...tabs);
  }

  const pages = formatPages(map);
  if (pages.length > 0) {
    sections.push('', '### Known Pages', ...pages);
  }

  const routes = formatRoutes(map);
  if (routes.length > 0) {
    sections.push('', '### Known Routes', ...routes);
  }

  sections.push(
    '',
    '### Usage Rules',
    '- Treat this map as a hint, not ground truth.',
    '- If the current screen conflicts with the map, trust the live screen.',
    '- When a requested destination matches a known page or route, use the mapped path first.',
  );

  return sections.join('\n');
}

export function shouldUseAppMapContext(query: string, map: AppMap): boolean {
  const trimmedQuery = query.trim();
  if (trimmedQuery.length === 0) {
    return false;
  }

  if (COMPOSITE_TASK_PATTERN.test(trimmedQuery)) {
    return false;
  }

  if (PAGE_INTERACTION_PATTERN.test(trimmedQuery)) {
    return false;
  }

  if (!NAVIGATION_INTENT_PATTERN.test(trimmedQuery)) {
    return false;
  }

  const knownTargets = getKnownTargets(map);

  return knownTargets.some((target) => trimmedQuery.includes(target));
}

export function extractTargetPageName(query: string, map: AppMap): string | null {
  const trimmedQuery = query.trim();
  const matches = getKnownTargets(map)
    .filter((target) => trimmedQuery.includes(target))
    .sort((left, right) => right.length - left.length);

  return matches[0] || null;
}

export function extractNavigationSubtask(
  query: string,
  map: AppMap,
): { navigationQuery: string; remainingQuery: string } | null {
  if (!COMPOSITE_TASK_PATTERN.test(query)) {
    return null;
  }

  const [firstSegment, ...rest] = splitCompositeQuery(query);
  if (!firstSegment || rest.length === 0) {
    return null;
  }

  if (!shouldUseAppMapContext(firstSegment, map)) {
    return null;
  }

  const remainingQuery = rest.join('，').trim();
  if (remainingQuery.length === 0) {
    return null;
  }

  return {
    navigationQuery: firstSegment,
    remainingQuery,
  };
}

export function buildNavigationGoalPrompt(map: AppMap, targetPageName: string): string {
  const sections = [
    buildAppMapContextPrompt(map),
    '',
    '## Navigation Goal',
    `Target Page: ${targetPageName}`,
    '- Your only goal in this stage is to navigate to the target page.',
    '- Stop only after you have at least two independent signals that the target page is active.',
    '- Independent signals can include the target tab being selected, a target page title, or target-specific page content.',
    '- Confirm the target page across two consecutive screenshots before finishing.',
    '- After the first likely arrival, wait for one more screenshot and confirm the target page is still active.',
    '- If the page is not confirmed after the extra check, continue navigating instead of finishing early.',
  ];

  return sections.join('\n');
}

export function buildOnPageActionPrompt(
  targetPageName: string,
  remainingInstruction: string,
): string {
  return [
    '## Current Page Anchor',
    `You are already on the target page: ${targetPageName}.`,
    `Remaining Task: ${remainingInstruction}`,
    '- Focus only on the remaining on-page action.',
    '- Do not switch tabs, reopen navigation, or leave the current page unless the user explicitly asks for it.',
    '- Choose the single best candidate for the remaining task instead of sampling multiple similar targets.',
    '- If one click clearly completes the remaining task, finish immediately.',
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
