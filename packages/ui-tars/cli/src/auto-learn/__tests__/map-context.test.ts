/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it } from 'vitest';
import type { AppMap } from '../types';
import {
  buildAppMapContextPrompt,
  buildOnPageHistoryMessages,
  buildNavigationGoalPrompt,
  buildOnPageActionPrompt,
  extractNavigationSubtask,
  extractTargetPageName,
  shouldUseAppMapContext,
} from '../map-context';

const MAP: AppMap = {
  meta: {
    appName: 'demo-app',
    package: 'com.example.demo',
    screenWidth: 1080,
    screenHeight: 2400,
    learnTime: 1234,
    learnDate: '2026-04-16T00:00:00.000Z',
    device: 'device-1',
  },
  navigation: {
    tabs: [
      { index: 1, name: 'Home', coords: [100, 2200], bbox: [], status: 'reliable' },
      { index: 2, name: 'Messages', coords: [700, 2200], bbox: [], status: 'reliable' },
    ],
    topButtons: [],
  },
  pages: {
    Home: {
      name: 'Home',
      depth: 1,
      layout: 'unknown',
      regions: [],
    },
    Messages: {
      name: 'Messages',
      depth: 1,
      layout: 'unknown',
      regions: [],
    },
  },
  secondaryPages: {},
  navigationGraph: {
    Home: ['Messages'],
  },
};

describe('buildAppMapContextPrompt', () => {
  it('includes known tabs, pages, and routes', () => {
    const prompt = buildAppMapContextPrompt(MAP);
    expect(prompt).toContain('## App Map Context');
    expect(prompt).toContain('Tab 1: Home');
    expect(prompt).toContain('Home -> Messages');
  });
});

describe('shouldUseAppMapContext', () => {
  it('returns true for single-step navigation tasks to known targets', () => {
    expect(shouldUseAppMapContext('switch to the Messages tab', MAP)).toBe(true);
    expect(shouldUseAppMapContext('go to Home', MAP)).toBe(true);
  });

  it('returns false for composite tasks', () => {
    expect(shouldUseAppMapContext('switch to Messages, then open the first conversation', MAP)).toBe(
      false,
    );
  });

  it('returns false for page-level interaction tasks', () => {
    expect(shouldUseAppMapContext('open the first conversation in Messages', MAP)).toBe(false);
    expect(shouldUseAppMapContext('go to Home and click the first card', MAP)).toBe(false);
  });

  it('returns false when the query does not mention a known target', () => {
    expect(shouldUseAppMapContext('switch to Settings', MAP)).toBe(false);
  });

  it('still supports non-English navigation labels', () => {
    const localizedMap: AppMap = {
      ...MAP,
      navigation: {
        ...MAP.navigation,
        tabs: [{ index: 1, name: '消息', coords: [700, 2200], bbox: [], status: 'reliable' }],
      },
      pages: {
        消息: {
          name: '消息',
          depth: 1,
          layout: 'unknown',
          regions: [],
        },
      },
      navigationGraph: {},
    };
    expect(shouldUseAppMapContext('切换到消息页', localizedMap)).toBe(true);
  });
});

describe('extractNavigationSubtask', () => {
  it('extracts navigation and follow-up actions from composite tasks', () => {
    expect(
      extractNavigationSubtask('switch to the Messages tab, then open the first conversation', MAP),
    ).toEqual({
      navigationQuery: 'switch to the Messages tab',
      remainingQuery: 'open the first conversation',
    });
  });

  it('returns null for pure navigation tasks', () => {
    expect(extractNavigationSubtask('switch to the Messages tab', MAP)).toBeNull();
  });

  it('returns null when the first segment is not a known navigation target', () => {
    expect(extractNavigationSubtask('open the profile editor, then change the nickname', MAP)).toBeNull();
  });
});

describe('extractTargetPageName', () => {
  it('extracts a known page name from a navigation query', () => {
    expect(extractTargetPageName('switch to the Messages tab', MAP)).toBe('Messages');
    expect(extractTargetPageName('go to Home', MAP)).toBe('Home');
  });

  it('returns null when no known target appears in the query', () => {
    expect(extractTargetPageName('switch to Settings', MAP)).toBeNull();
  });
});

describe('stage prompts', () => {
  it('builds a navigation prompt with conservative arrival rules', () => {
    const prompt = buildNavigationGoalPrompt(MAP, 'Messages');
    expect(prompt).toContain('Navigation Goal');
    expect(prompt).toContain('Target Page: Messages');
    expect(prompt).toContain('two independent signals');
    expect(prompt).toContain('two consecutive screenshots');
  });

  it('builds an on-page action prompt that prevents extra navigation', () => {
    const prompt = buildOnPageActionPrompt('Messages', 'open the first conversation');
    expect(prompt).toContain('Current Page Anchor');
    expect(prompt).toContain('You are already on the target page: Messages');
    expect(prompt).toContain('Remaining Task: open the first conversation');
    expect(prompt).toContain('Do not switch tabs');
    expect(prompt).toContain('Do not repeat the same click');
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
