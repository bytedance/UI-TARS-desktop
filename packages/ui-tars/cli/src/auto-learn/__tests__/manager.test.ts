/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockLoadMap = vi.fn();
const mockLoadUIMap = vi.fn();
const mockSaveMap = vi.fn();
const mockSaveUIMap = vi.fn();
const mockLearnTabs = vi.fn();
const mockLearnPageElements = vi.fn();
const mockLaunchApp = vi.fn();
const mockAdbClick = vi.fn();
const mockAdbWake = vi.fn();
const mockAdbHome = vi.fn();
const mockAdbBack = vi.fn();
const mockAdbScreenSize = vi.fn();
const mockSleep = vi.fn().mockResolvedValue(undefined);
const mockSaveScreenshot = vi.fn();
const mockScreenshot = vi.fn();

vi.mock('../map-storage', () => ({
  loadMap: mockLoadMap,
  loadUIMap: mockLoadUIMap,
  saveMap: mockSaveMap,
  saveUIMap: mockSaveUIMap,
  SS_DIR: '/tmp',
}));

vi.mock('../tab-learner', () => ({
  learnTabs: mockLearnTabs,
}));

vi.mock('../page-learner', () => ({
  learnPageElements: mockLearnPageElements,
}));

vi.mock('../app-launcher', () => ({
  launchApp: mockLaunchApp,
  adbClick: mockAdbClick,
  adbWake: mockAdbWake,
  adbHome: mockAdbHome,
  adbBack: mockAdbBack,
  adbScreenSize: mockAdbScreenSize,
  sleep: mockSleep,
}));

vi.mock('../utils', async () => {
  const actual = await vi.importActual<typeof import('../utils')>('../utils');
  return {
    ...actual,
    saveScreenshot: mockSaveScreenshot,
  };
});

vi.mock('@ui-tars/operator-adb', () => ({
  AdbOperator: vi.fn().mockImplementation(() => ({
    screenshot: mockScreenshot,
  })),
}));

describe('autoLearnAndRun', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadMap.mockReturnValue(null);
    mockLoadUIMap.mockReturnValue(null);
    mockAdbScreenSize.mockReturnValue({ width: 1080, height: 2400 });
    mockScreenshot.mockResolvedValue({ base64: 'screenshot' });
    mockLearnTabs.mockResolvedValue([
      { index: 1, name: 'Home', coords: [100, 2200], bbox: [40, 2140, 160, 2280], status: 'reliable' },
    ]);
    mockLearnPageElements.mockResolvedValue({
      pageMap: {
        name: 'Home',
        depth: 1,
        layout: 'unknown',
        regions: [
          {
            id: 'Home_main',
            position: 'full',
            bbox: [0, 0, 1080, 2400],
            type: 'static',
            scrollable: false,
            description: 'Main content area',
            elements: [
              {
                id: 'Home_Search_input',
                name: 'Search',
                coords: [540, 220],
                bbox: [200, 160, 880, 280],
                type: 'input',
                action: 'input',
                status: 'reliable',
                retryCount: 0,
              },
            ],
          },
        ],
        backAction: { type: 'hotkey', key: 'back' },
      },
      jumpTargets: [],
    });
  });

  it('saves a directly generated UI map with stable ids during learning', async () => {
    const { autoLearnAndRun } = await import('../manager');

    const result = await autoLearnAndRun({
      pkg: 'com.example.demo',
      deviceId: 'device-1',
      modelConfig: {
        baseURL: 'http://localhost:8000/v1',
        apiKey: 'test',
        model: 'autoglm-phone-9b',
      },
    });

    expect(result).not.toBeNull();
    expect(mockSaveUIMap).toHaveBeenCalled();

    const savedUIMap = mockSaveUIMap.mock.calls.at(-1)?.[1];
    expect(savedUIMap.pages.page_1.label.primary).toBe('Home');
    expect(savedUIMap.elements.nav_page_1_1.targetPageId).toBe('page_1');
    expect(savedUIMap.elements.element_page_1_1.label.primary).toBe('Search');
  });
});
