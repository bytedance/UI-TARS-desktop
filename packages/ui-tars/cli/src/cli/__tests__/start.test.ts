/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppMap } from '../../auto-learn';

const mockRun = vi.fn();
const mockGUIAgent = vi.fn().mockImplementation((config) => ({
  run: mockRun,
  config,
}));
const mockAutoLearnAndRun = vi.fn();
const mockLoadMap = vi.fn();
const mockBuildAppMapContextPrompt = vi.fn();
const mockBuildNavigationGoalPrompt = vi.fn();
const mockBuildOnPageActionPrompt = vi.fn();
const mockBuildOnPageHistoryMessages = vi.fn();
const mockShouldUseAppMapContext = vi.fn();
const mockExtractNavigationSubtask = vi.fn();
const mockExtractTargetPageName = vi.fn();
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
  loadMap: mockLoadMap,
  buildAppMapContextPrompt: mockBuildAppMapContextPrompt,
  buildNavigationGoalPrompt: mockBuildNavigationGoalPrompt,
  buildOnPageActionPrompt: mockBuildOnPageActionPrompt,
  buildOnPageHistoryMessages: mockBuildOnPageHistoryMessages,
  shouldUseAppMapContext: mockShouldUseAppMapContext,
  extractNavigationSubtask: mockExtractNavigationSubtask,
  extractTargetPageName: mockExtractTargetPageName,
}));

describe('start', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAndroidDeviceId.mockResolvedValue('device-1');
    mockAdbOperator.mockImplementation(() => ({ kind: 'adb' }));
    mockRun.mockResolvedValue(undefined);
    mockBuildAppMapContextPrompt.mockReturnValue(
      '## App Map Context\n- Known page: Home\n- Home -> Messages',
    );
    mockBuildNavigationGoalPrompt.mockImplementation(
      (_map, targetPageName: string) => `## Navigation Goal\nTarget Page: ${targetPageName}`,
    );
    mockBuildOnPageActionPrompt.mockReturnValue(
      '## Current Page Anchor\nYou are already on the target page: Messages\nRemaining Task: open the first conversation',
    );
    mockBuildOnPageHistoryMessages.mockReturnValue([
      {
        from: 'human',
        value: 'Navigation stage result: the target page Messages has been reached.',
      },
    ]);
    mockShouldUseAppMapContext.mockReturnValue(true);
    mockExtractNavigationSubtask.mockReturnValue(null);
    mockExtractTargetPageName.mockImplementation((query: string) =>
      query.includes('Home') ? 'Home' : 'Messages',
    );
  });

  it('injects learned app map context into GUIAgent for navigation tasks', async () => {
    const map: AppMap = {
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
          { index: 2, name: 'Messages', coords: [300, 2200], bbox: [], status: 'reliable' },
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
    mockAutoLearnAndRun.mockResolvedValue(map);

    const { start } = await import('../start');
    await start({
      target: 'adb',
      query: 'switch to the Home tab',
      autoLearn: true,
      package: 'com.example.demo',
    });

    expect(mockAutoLearnAndRun).toHaveBeenCalled();
    expect(mockGUIAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        systemPromptSuffix: expect.stringContaining('Navigation Goal'),
      }),
    );
    expect(mockGUIAgent.mock.calls[0][0].systemPromptSuffix).toContain('Home');
    expect(mockRun).toHaveBeenCalledWith('switch to the Home tab', undefined);
  });

  it('does not inject app map context when the task is not purely navigational', async () => {
    mockShouldUseAppMapContext.mockReturnValue(false);
    mockAutoLearnAndRun.mockResolvedValue({
      meta: {
        appName: 'demo-app',
        package: 'com.example.demo',
        screenWidth: 1080,
        screenHeight: 2400,
        learnTime: 1234,
        learnDate: '2026-04-16T00:00:00.000Z',
        device: 'device-1',
      },
      navigation: { tabs: [], topButtons: [] },
      pages: {},
      secondaryPages: {},
      navigationGraph: {},
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
        systemPromptSuffix: expect.stringContaining('App Map Context'),
      }),
    );
  });

  it('disables app map usage entirely when appMapMode is off', async () => {
    mockAutoLearnAndRun.mockResolvedValue({
      meta: {
        appName: 'demo-app',
        package: 'com.example.demo',
        screenWidth: 1080,
        screenHeight: 2400,
        learnTime: 1234,
        learnDate: '2026-04-16T00:00:00.000Z',
        device: 'device-1',
      },
      navigation: { tabs: [], topButtons: [] },
      pages: {},
      secondaryPages: {},
      navigationGraph: {},
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
    mockShouldUseAppMapContext.mockReturnValue(false);
    mockExtractNavigationSubtask.mockReturnValue({
      navigationQuery: 'switch to the Messages tab',
      remainingQuery: 'open the first conversation',
    });
    mockAutoLearnAndRun.mockResolvedValue({
      meta: {
        appName: 'demo-app',
        package: 'com.example.demo',
        screenWidth: 1080,
        screenHeight: 2400,
        learnTime: 1234,
        learnDate: '2026-04-16T00:00:00.000Z',
        device: 'device-1',
      },
      navigation: { tabs: [], topButtons: [] },
      pages: {},
      secondaryPages: {},
      navigationGraph: {},
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

  it('injects cached app map context for navigation tasks when package is provided without auto-learn', async () => {
    mockLoadMap.mockResolvedValue?.(undefined);
    mockLoadMap.mockReturnValue({
      meta: {
        appName: 'demo-app',
        package: 'com.example.demo',
        screenWidth: 1080,
        screenHeight: 2400,
        learnTime: 1234,
        learnDate: '2026-04-16T00:00:00.000Z',
        device: 'device-1',
      },
      navigation: { tabs: [], topButtons: [] },
      pages: {},
      secondaryPages: {},
      navigationGraph: {},
    });

    const { start } = await import('../start');
    await start({
      target: 'adb',
      query: 'switch to the Home tab',
      package: 'com.example.demo',
    });

    expect(mockLoadMap).toHaveBeenCalledWith('com.example.demo');
    expect(mockGUIAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        systemPromptSuffix: expect.stringContaining('Navigation Goal'),
      }),
    );
  });

  it('does not split composite tasks when appMapMode is navigation', async () => {
    mockExtractNavigationSubtask.mockReturnValue({
      navigationQuery: 'switch to the Messages tab',
      remainingQuery: 'open the first conversation',
    });
    mockAutoLearnAndRun.mockResolvedValue({
      meta: {
        appName: 'demo-app',
        package: 'com.example.demo',
        screenWidth: 1080,
        screenHeight: 2400,
        learnTime: 1234,
        learnDate: '2026-04-16T00:00:00.000Z',
        device: 'device-1',
      },
      navigation: { tabs: [], topButtons: [] },
      pages: {},
      secondaryPages: {},
      navigationGraph: {},
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
