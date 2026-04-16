/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UIMap } from '../../auto-learn';

const mockRun = vi.fn();
const mockGUIAgent = vi.fn().mockImplementation((config) => ({
  run: mockRun,
  config,
}));
const mockAutoLearnAndRun = vi.fn();
const mockLoadUIMap = vi.fn();
const mockBuildRuntimeMapView = vi.fn();
const mockBuildRuntimeMapViewPrompt = vi.fn();
const mockParseRuntimeIntent = vi.fn();
const mockResolveRuntimeLocale = vi.fn();
const mockBuildNavigationGoalPrompt = vi.fn();
const mockBuildOnPageActionPrompt = vi.fn();
const mockBuildOnPageHistoryMessages = vi.fn();
const mockGetAndroidDeviceId = vi.fn();
const mockAdbOperator = vi.fn();

vi.mock('node-fetch', () => ({
  default: vi.fn(),
}));

vi.mock('node:fs', () => ({
  default: {
    existsSync: vi.fn(() => true),
    readFileSync: vi.fn(() =>
      JSON.stringify({
        baseURL: 'http://localhost:8000/v1',
        apiKey: 'test',
        model: 'autoglm-phone-9b',
        useResponsesApi: false,
      }),
    ),
    writeFileSync: vi.fn(),
  },
}));

vi.mock('@ui-tars/sdk', () => ({
  GUIAgent: mockGUIAgent,
}));

vi.mock('@ui-tars/operator-adb', () => ({
  getAndroidDeviceId: mockGetAndroidDeviceId,
  AdbOperator: mockAdbOperator,
}));

vi.mock('@ui-tars/operator-nut-js', () => ({
  NutJSOperator: vi.fn(),
}));

vi.mock('../../auto-learn', () => ({
  autoLearnAndRun: mockAutoLearnAndRun,
  loadUIMap: mockLoadUIMap,
  buildRuntimeMapView: mockBuildRuntimeMapView,
  buildRuntimeMapViewPrompt: mockBuildRuntimeMapViewPrompt,
  parseRuntimeIntent: mockParseRuntimeIntent,
  resolveRuntimeLocale: mockResolveRuntimeLocale,
  DEFAULT_RUNTIME_LOCALE: {
    compositeDelimiters: ['then', 'after', '然后', '之后'],
    contentActionTerms: ['chat', 'conversation', '会话', '对话', 'send', 'reply', '输入'],
  },
  RUNTIME_BUDGETS: {
    small: {
      mode: 'focused',
    },
  },
  buildNavigationGoalPrompt: mockBuildNavigationGoalPrompt,
  buildOnPageActionPrompt: mockBuildOnPageActionPrompt,
  buildOnPageHistoryMessages: mockBuildOnPageHistoryMessages,
}));

describe('start', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAndroidDeviceId.mockResolvedValue('device-1');
    mockAdbOperator.mockImplementation(() => ({ kind: 'adb' }));
    mockRun.mockResolvedValue(undefined);
    mockBuildNavigationGoalPrompt.mockImplementation(
      (targetPageName: string) => `## Navigation Goal\nTarget Page: ${targetPageName}`,
    );
    mockBuildRuntimeMapView.mockReturnValue({
      mode: 'focused',
      budget: {},
      currentPageCandidates: [{ id: 'page_1', label: 'Home', confidence: 0.9, score: 1 }],
      targetPageCandidates: [{ id: 'page_2', label: 'Messages', confidence: 0.88, score: 0.9 }],
      pages: {},
      elements: {
        element_1: {
          id: 'element_1',
          pageId: 'page_2',
          role: 'action',
          action: 'click',
          label: 'Conversation',
          confidence: 0.88,
          score: 0.86,
          locators: [],
        },
      },
      truncated: false,
      expansionHints: [],
    });
    mockBuildRuntimeMapViewPrompt.mockReturnValue(
      '## Runtime Map View\nCurrent Page Candidates:\n- page_1 (Home)\nTarget Page Candidates:\n- page_2 (Messages)',
    );
    mockResolveRuntimeLocale.mockImplementation((locale?: string) => ({
      compositeDelimiters: locale === 'en' ? ['then', 'after'] : ['then', 'after', '然后', '之后'],
      contentActionTerms: ['chat', 'conversation', '会话', '对话', 'send', 'reply', '输入'],
    }));
    mockParseRuntimeIntent.mockImplementation((query: string) =>
      query.includes('then')
        ? {
            kind: 'navigate_then_act',
            rawQuery: query,
            navigationQuery: 'switch to the Messages tab',
            remainingQuery: 'open the first conversation',
            targetPage: {
              id: 'page_2',
              label: 'Messages',
              confidence: 0.88,
              score: 0.9,
            },
            targetElements: [
              {
                elementId: 'element_1',
                pageId: 'page_2',
                role: 'action',
                action: 'click',
                label: 'Conversation',
                confidence: 0.88,
                score: 0.86,
              },
            ],
            completionPolicy: 'stop_on_target_open',
          }
        : {
            kind: 'navigate',
            rawQuery: query,
            targetPage: {
              id: query.includes('Home') ? 'page_1' : 'page_2',
              label: query.includes('Home') ? 'Home' : 'Messages',
              confidence: query.includes('Home') ? 0.9 : 0.88,
              score: query.includes('Home') ? 1 : 0.9,
            },
            completionPolicy: 'stop_on_page_arrival',
          },
    );
    mockLoadUIMap.mockReturnValue({
      meta: {
        schemaVersion: 2,
        appId: 'com.example.demo',
        appName: 'demo-app',
        platform: 'android',
        screenWidth: 1080,
        screenHeight: 2400,
        learnTime: 1234,
        learnDate: '2026-04-16T00:00:00.000Z',
        device: 'device-1',
      },
      pages: {},
      regions: {},
      elements: {},
      navigation: [],
    } satisfies UIMap);
    mockBuildOnPageActionPrompt.mockReturnValue(
      '## Current Page Anchor\nYou are already on the target page: Messages\nRemaining Task: open the first conversation',
    );
    mockBuildOnPageHistoryMessages.mockReturnValue([
      {
        from: 'human',
        value: 'Navigation stage result: the target page Messages has been reached.',
      },
    ]);
  });

  it('injects learned UI map context into GUIAgent for navigation tasks', async () => {
    const uiMap: UIMap = {
      meta: {
        schemaVersion: 2,
        appId: 'com.example.demo',
        appName: 'demo-app',
        platform: 'android',
        screenWidth: 1080,
        screenHeight: 2400,
        learnTime: 1234,
        learnDate: '2026-04-16T00:00:00.000Z',
        device: 'device-1',
      },
      pages: {
        page_1: {
          id: 'page_1',
          label: { primary: 'Home' },
          depth: 1,
          layout: 'unknown',
          status: 'reliable',
          confidence: 0.9,
          regionIds: [],
        },
        page_2: {
          id: 'page_2',
          label: { primary: 'Messages' },
          depth: 1,
          layout: 'unknown',
          status: 'reliable',
          confidence: 0.88,
          regionIds: [],
        },
      },
      regions: {},
      elements: {},
      navigation: [],
    };
    mockAutoLearnAndRun.mockResolvedValue(uiMap);

    const { start } = await import('../start');
    await start({
      target: 'adb',
      query: 'switch to the Home tab',
      autoLearn: true,
      package: 'com.example.demo',
    });

    expect(mockAutoLearnAndRun).toHaveBeenCalled();
    expect(mockBuildRuntimeMapView).toHaveBeenCalled();
    expect(mockGUIAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        systemPromptSuffix: expect.stringContaining('Navigation Goal'),
      }),
    );
    expect(mockGUIAgent.mock.calls[0][0].systemPromptSuffix).toContain('Home');
    expect(mockGUIAgent.mock.calls[0][0].systemPromptSuffix).toContain('Runtime Map View');
    expect(mockRun).toHaveBeenCalledWith('switch to the Home tab', undefined);
  });

  it('passes the configured runtime locale preset into runtime parsing', async () => {
    mockAutoLearnAndRun.mockResolvedValue({
      meta: {
        schemaVersion: 2,
        appId: 'com.example.demo',
        appName: 'demo-app',
        platform: 'android',
        screenWidth: 1080,
        screenHeight: 2400,
        learnTime: 1234,
        learnDate: '2026-04-16T00:00:00.000Z',
        device: 'device-1',
      },
      pages: {},
      regions: {},
      elements: {},
      navigation: [],
    });

    const { start } = await import('../start');
    await start({
      target: 'adb',
      query: 'switch to the Home tab',
      autoLearn: true,
      package: 'com.example.demo',
      runtimeLocale: 'en',
    });

    expect(mockParseRuntimeIntent).toHaveBeenCalledWith(
      'switch to the Home tab',
      expect.any(Object),
      expect.objectContaining({
        compositeDelimiters: ['then', 'after'],
      }),
    );
  });

  it('does not inject navigation goal when the task is not purely navigational', async () => {
    mockParseRuntimeIntent.mockReturnValue({
      kind: 'act',
      rawQuery: 'switch to the Messages tab, then open the first conversation',
      actionQuery: 'switch to the Messages tab, then open the first conversation',
      targetElements: [],
      completionPolicy: 'stop_on_target_open',
    });
    mockAutoLearnAndRun.mockResolvedValue({
      meta: {
        schemaVersion: 2,
        appId: 'com.example.demo',
        appName: 'demo-app',
        platform: 'android',
        screenWidth: 1080,
        screenHeight: 2400,
        learnTime: 1234,
        learnDate: '2026-04-16T00:00:00.000Z',
        device: 'device-1',
      },
      pages: {},
      regions: {},
      elements: {},
      navigation: [],
    });

    const { start } = await import('../start');
    await start({
      target: 'adb',
      query: 'switch to the Messages tab, then open the first conversation',
      autoLearn: true,
      package: 'com.example.demo',
    });

    expect(mockGUIAgent).toHaveBeenCalledWith(
      expect.not.objectContaining({
        systemPromptSuffix: expect.stringContaining('Navigation Goal'),
      }),
    );
  });

  it('disables app map usage entirely when appMapMode is off', async () => {
    mockAutoLearnAndRun.mockResolvedValue({
      meta: {
        schemaVersion: 2,
        appId: 'com.example.demo',
        appName: 'demo-app',
        platform: 'android',
        screenWidth: 1080,
        screenHeight: 2400,
        learnTime: 1234,
        learnDate: '2026-04-16T00:00:00.000Z',
        device: 'device-1',
      },
      pages: {},
      regions: {},
      elements: {},
      navigation: [],
    });

    const { start } = await import('../start');
    await start({
      target: 'adb',
      query: 'switch to the Home tab',
      autoLearn: true,
      appMapMode: 'off',
      package: 'com.example.demo',
    });

    expect(mockGUIAgent).toHaveBeenCalledWith(
      expect.not.objectContaining({
        systemPromptSuffix: expect.any(String),
      }),
    );
  });

  it('runs composite tasks in two stages when a navigation subtask can be extracted', async () => {
    mockAutoLearnAndRun.mockResolvedValue({
      meta: {
        schemaVersion: 2,
        appId: 'com.example.demo',
        appName: 'demo-app',
        platform: 'android',
        screenWidth: 1080,
        screenHeight: 2400,
        learnTime: 1234,
        learnDate: '2026-04-16T00:00:00.000Z',
        device: 'device-1',
      },
      pages: {},
      regions: {},
      elements: {},
      navigation: [],
    });

    const { start } = await import('../start');
    await start({
      target: 'adb',
      query: 'switch to the Messages tab, then open the first conversation',
      autoLearn: true,
      package: 'com.example.demo',
    });

    expect(mockGUIAgent).toHaveBeenCalledTimes(2);
    expect(mockGUIAgent.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        systemPromptSuffix: expect.stringContaining('Navigation Goal'),
      }),
    );
    expect(mockGUIAgent.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        systemPromptSuffix: expect.stringContaining('Current Page Anchor'),
      }),
    );
    expect(mockGUIAgent.mock.calls[1][0].systemPromptSuffix).toContain(
      'Remaining Task: open the first conversation',
    );
    expect(mockRun.mock.calls[0][0]).toBe('switch to the Messages tab');
    expect(mockRun.mock.calls[0][1]).toBeUndefined();
    expect(mockRun.mock.calls[1][0]).toBe('open the first conversation');
    expect(mockRun.mock.calls[1][1]).toEqual([
      {
        from: 'human',
        value: 'Navigation stage result: the target page Messages has been reached.',
      },
    ]);
  });

  it('injects cached UI map context for navigation tasks when package is provided without auto-learn', async () => {
    mockLoadUIMap.mockReturnValue({
      meta: {
        schemaVersion: 2,
        appId: 'com.example.demo',
        appName: 'demo-app',
        platform: 'android',
        screenWidth: 1080,
        screenHeight: 2400,
        learnTime: 1234,
        learnDate: '2026-04-16T00:00:00.000Z',
        device: 'device-1',
      },
      pages: {},
      regions: {},
      elements: {},
      navigation: [],
    });

    const { start } = await import('../start');
    await start({
      target: 'adb',
      query: 'switch to the Home tab',
      package: 'com.example.demo',
    });

    expect(mockLoadUIMap).toHaveBeenCalledWith('com.example.demo');
    expect(mockGUIAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        systemPromptSuffix: expect.stringContaining('Navigation Goal'),
      }),
    );
  });

  it('runs without map-derived navigation prompts when no UI map is available', async () => {
    mockLoadUIMap.mockReturnValue(null);

    const { start } = await import('../start');
    await start({
      target: 'adb',
      query: 'switch to the Home tab',
      package: 'com.example.demo',
    });

    expect(mockBuildRuntimeMapView).not.toHaveBeenCalled();
    expect(mockGUIAgent.mock.calls[0][0].systemPromptSuffix).toBeUndefined();
  });

  it('does not split composite tasks when appMapMode is navigation', async () => {
    mockParseRuntimeIntent.mockReturnValue({
      kind: 'navigate_then_act',
      rawQuery: 'switch to the Messages tab, then open the first conversation',
      navigationQuery: 'switch to the Messages tab',
      remainingQuery: 'open the first conversation',
      targetPage: {
        id: 'page_2',
        label: 'Messages',
        confidence: 0.88,
        score: 0.9,
      },
      targetElements: [
        {
          elementId: 'element_1',
          pageId: 'page_2',
          role: 'action',
          action: 'click',
          label: 'Conversation',
          confidence: 0.88,
          score: 0.86,
        },
      ],
      completionPolicy: 'stop_on_target_open',
    });
    mockAutoLearnAndRun.mockResolvedValue({
      meta: {
        schemaVersion: 2,
        appId: 'com.example.demo',
        appName: 'demo-app',
        platform: 'android',
        screenWidth: 1080,
        screenHeight: 2400,
        learnTime: 1234,
        learnDate: '2026-04-16T00:00:00.000Z',
        device: 'device-1',
      },
      pages: {},
      regions: {},
      elements: {},
      navigation: [],
    });

    const { start } = await import('../start');
    await start({
      target: 'adb',
      query: 'switch to the Messages tab, then open the first conversation',
      autoLearn: true,
      appMapMode: 'navigation',
      package: 'com.example.demo',
    });

    expect(mockGUIAgent).toHaveBeenCalledTimes(1);
  });
});
