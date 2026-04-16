/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it } from 'vitest';
import type { RuntimeMapView } from '../types';
import { DEFAULT_RUNTIME_LOCALE } from '../runtime-locale';
import {
  buildNavigationGoalPrompt,
  buildOnPageHistoryMessages,
  buildOnPageActionPrompt,
  extractNavigationSubtaskFromRuntimeMapView,
  extractTargetPageLabelFromRuntimeMapView,
  parseRuntimeIntent,
  shouldUseRuntimeMapView,
} from '../map-context';

const RUNTIME_VIEW: RuntimeMapView = {
  mode: 'focused',
  budget: {
    mode: 'focused',
    maxPageCandidates: 3,
    maxElementsPerPage: 12,
    maxTotalElements: 24,
    maxLocatorsPerElement: 3,
    maxSignatureTextsPerPage: 3,
    includeNavigationElements: true,
    includePrimaryActionElements: true,
    includeInputElements: true,
    includeAnchorElements: true,
    includeContentTemplates: false,
    includeNeighborRelations: false,
    includePageTransitions: true,
    minPageConfidence: 0.5,
    minElementConfidence: 0.55,
    minLocatorConfidence: 0.6,
  },
  currentPageCandidates: [{ id: 'page_1', label: 'Home', aliases: ['Start'], confidence: 0.9, score: 1 }],
  targetPageCandidates: [{ id: 'page_2', label: 'Messages', aliases: ['Inbox'], confidence: 0.88, score: 0.9 }],
  pages: {},
  elements: {
    element_1: {
      id: 'element_1',
      pageId: 'page_2',
      role: 'action',
      action: 'click',
      label: 'Chat',
      aliases: ['Conversation'],
      confidence: 0.86,
      score: 0.82,
      locators: [],
    },
    element_2: {
      id: 'element_2',
      pageId: 'page_2',
      role: 'input',
      action: 'input',
      label: 'Message',
      aliases: ['Reply'],
      confidence: 0.81,
      score: 0.8,
      locators: [],
    },
  },
  transitions: [],
  truncated: false,
  expansionHints: [],
};

describe('runtime map navigation helpers', () => {
  it('uses runtime candidates for navigation tasks', () => {
    expect(shouldUseRuntimeMapView('switch to the Messages tab', RUNTIME_VIEW)).toBe(true);
    expect(shouldUseRuntimeMapView('go to Home', RUNTIME_VIEW)).toBe(true);
    expect(shouldUseRuntimeMapView('open the first conversation', RUNTIME_VIEW)).toBe(false);
  });

  it('extracts a target page label from runtime candidates', () => {
    expect(extractTargetPageLabelFromRuntimeMapView('switch to the Messages tab', RUNTIME_VIEW)).toBe('Messages');
    expect(extractTargetPageLabelFromRuntimeMapView('go to Settings', RUNTIME_VIEW)).toBeNull();
  });

  it('extracts navigation and follow-up actions from composite tasks', () => {
    expect(
      extractNavigationSubtaskFromRuntimeMapView(
        'switch to the Messages tab, then open the first conversation',
        RUNTIME_VIEW,
        DEFAULT_RUNTIME_LOCALE,
      ),
    ).toEqual({
      navigationQuery: 'switch to the Messages tab',
      remainingQuery: 'open the first conversation',
    });
  });

  it('parses structured runtime intent for composite navigation tasks', () => {
    expect(
      parseRuntimeIntent(
        'switch to the Messages tab, then open the first conversation',
        RUNTIME_VIEW,
        DEFAULT_RUNTIME_LOCALE,
      ),
    ).toMatchObject({
      kind: 'navigate_then_act',
      rawQuery: 'switch to the Messages tab, then open the first conversation',
      navigationQuery: 'switch to the Messages tab',
      remainingQuery: 'open the first conversation',
      targetPage: {
        id: 'page_2',
        label: 'Messages',
        aliases: ['Inbox'],
      },
      targetElements: [
        {
          elementId: 'element_1',
          pageId: 'page_2',
          role: 'action',
          action: 'click',
          label: 'Chat',
          aliases: ['Conversation'],
        },
      ],
      completionPolicy: 'stop_on_target_open',
    });
  });

  it('uses runtime element candidates before locale fallback for action tasks', () => {
    expect(
      parseRuntimeIntent('type a reply in Message', RUNTIME_VIEW, DEFAULT_RUNTIME_LOCALE),
    ).toMatchObject({
      kind: 'act',
      targetPage: { id: 'page_2', label: 'Messages' },
      targetElements: [
        {
          elementId: 'element_2',
          pageId: 'page_2',
          role: 'input',
        },
      ],
      completionPolicy: 'stop_after_content_action',
    });
  });

  it('treats a direct page label mention as navigation without locale intent words', () => {
    expect(parseRuntimeIntent('Messages', RUNTIME_VIEW, DEFAULT_RUNTIME_LOCALE)).toMatchObject({
      kind: 'navigate',
      rawQuery: 'Messages',
      targetPage: {
        id: 'page_2',
        label: 'Messages',
        aliases: ['Inbox'],
      },
      completionPolicy: 'stop_on_page_arrival',
    });
  });

  it('uses locale packs only as fallback for content-action policy', () => {
    expect(parseRuntimeIntent('Messages send', RUNTIME_VIEW, DEFAULT_RUNTIME_LOCALE)).toMatchObject({
      kind: 'act',
      rawQuery: 'Messages send',
      targetPage: {
        id: 'page_2',
        label: 'Messages',
        aliases: ['Inbox'],
      },
      targetElements: [
        {
          elementId: 'element_2',
          pageId: 'page_2',
          role: 'input',
        },
      ],
      completionPolicy: 'stop_after_content_action',
    });
  });
});

describe('stage prompts', () => {
  it('builds a navigation prompt with conservative arrival rules', () => {
    const prompt = buildNavigationGoalPrompt('Messages');
    expect(prompt).toContain('Navigation Goal');
    expect(prompt).toContain('Target Page: Messages');
    expect(prompt).toContain('two independent signals');
    expect(prompt).toContain('two consecutive screenshots');
  });

  it('builds an on-page action prompt that prevents extra navigation', () => {
    const prompt = buildOnPageActionPrompt('Messages', 'open the first conversation', 'stop_on_target_open');
    expect(prompt).toContain('Current Page Anchor');
    expect(prompt).toContain('You are already on the target page: Messages');
    expect(prompt).toContain('Remaining Task: open the first conversation');
    expect(prompt).toContain('Do not switch tabs');
    expect(prompt).toContain('Do not repeat the same click');
    expect(prompt).toContain('Do not type, send, or continue deeper');
  });

  it('allows deeper progression for explicit input tasks', () => {
    const prompt = buildOnPageActionPrompt('Messages', 'type hello to the conversation', 'stop_after_content_action');
    expect(prompt).toContain('Continue until the requested content action is complete');
  });

  it('builds handoff history messages for the on-page stage', () => {
    expect(buildOnPageHistoryMessages('Messages')).toEqual([
      {
        from: 'human',
        value: 'Navigation stage result: the target page Messages has been reached.',
      },
      {
        from: 'gpt',
        value: 'Acknowledged. I will stay on Messages and only perform the remaining on-page action.',
      },
    ]);
  });
});
