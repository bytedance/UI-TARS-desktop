/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it } from 'vitest';
import { buildUIMapFromLegacyMap } from '../compat/ui-map-builder';
import type { AppMap } from '../types';

describe('buildUIMapFromLegacyMap', () => {
  it('projects legacy app maps into stable-id UI maps', () => {
    const legacyMap: AppMap = {
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
          regions: [
            {
              id: 'home_main',
              position: 'full',
              bbox: [0, 0, 1080, 2400],
              type: 'static',
              scrollable: false,
              elements: [
                {
                  id: 'home_search',
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
        },
        Messages: {
          name: 'Messages',
          depth: 1,
          layout: 'list',
          regions: [
            {
              id: 'messages_main',
              position: 'full',
              bbox: [0, 0, 1080, 2400],
              type: 'scrollable-list',
              scrollable: true,
              elements: [
                {
                  id: 'messages_first',
                  name: 'First conversation',
                  coords: [540, 520],
                  bbox: [80, 420, 1000, 620],
                  type: 'list-item',
                  action: 'click',
                  status: 'reliable',
                  retryCount: 0,
                },
              ],
            },
          ],
        },
      },
      secondaryPages: {},
      navigationGraph: {
        Home: ['Messages'],
      },
    };

    const uiMap = buildUIMapFromLegacyMap(legacyMap);

    expect(uiMap.meta.appId).toBe('com.example.demo');
    expect(uiMap.pages.page_1?.label?.primary).toBe('Home');
    expect(uiMap.pages.page_2?.label?.primary).toBe('Messages');
    expect(uiMap.navigation).toContainEqual(
      expect.objectContaining({
        fromPageId: 'page_1',
        toPageId: 'page_2',
      }),
    );

    const navigationElements = Object.values(uiMap.elements).filter(
      (element) => element.role === 'navigation',
    );
    expect(navigationElements.some((element) => element.targetPageId === 'page_2')).toBe(true);

    const searchElement = Object.values(uiMap.elements).find(
      (element) => element.label?.primary === 'Search',
    );
    expect(searchElement?.locatorStrategies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'text', value: 'Search' }),
        expect.objectContaining({ type: 'normalized-box' }),
      ]),
    );
  });
});
