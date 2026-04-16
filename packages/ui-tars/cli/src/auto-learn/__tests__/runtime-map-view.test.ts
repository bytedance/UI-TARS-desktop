/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it } from 'vitest';
import { buildRuntimeMapView, expandRuntimeMapView, RUNTIME_BUDGETS } from '../runtime-map-view';
import type { UIMap } from '../types';

const MAP: UIMap = {
  meta: {
    schemaVersion: 2,
    appId: 'com.example.demo',
    appName: 'demo',
    platform: 'android',
    screenWidth: 1080,
    screenHeight: 2400,
    learnTime: 100,
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
      regionIds: ['region_page_1_main'],
      signatureTexts: ['Home', 'For You'],
      anchorElementIds: ['element_page_1_1'],
      backAction: { type: 'hotkey', key: 'back' },
    },
    page_2: {
      id: 'page_2',
      label: { primary: 'Messages' },
      depth: 1,
      layout: 'unknown',
      status: 'reliable',
      confidence: 0.88,
      regionIds: ['region_page_2_main'],
      signatureTexts: ['Messages', 'Inbox'],
      anchorElementIds: ['element_page_2_1'],
      backAction: { type: 'hotkey', key: 'back' },
    },
  },
  regions: {
    region_page_1_main: {
      id: 'region_page_1_main',
      pageId: 'page_1',
      position: 'full',
      bbox: [0, 0, 1080, 2400],
      normalizedBox: { left: 0, top: 0, width: 1, height: 1 },
      type: 'static',
      scrollable: false,
      elementIds: ['element_page_1_1', 'element_page_1_2'],
    },
    region_page_2_main: {
      id: 'region_page_2_main',
      pageId: 'page_2',
      position: 'full',
      bbox: [0, 0, 1080, 2400],
      normalizedBox: { left: 0, top: 0, width: 1, height: 1 },
      type: 'static',
      scrollable: false,
      elementIds: ['element_page_2_1', 'element_page_2_2'],
    },
  },
  elements: {
    element_page_1_1: {
      id: 'element_page_1_1',
      pageId: 'page_1',
      regionId: 'region_page_1_main',
      label: { primary: 'Messages' },
      textCandidates: ['Messages'],
      coords: [900, 2200],
      bbox: [840, 2140, 980, 2280],
      normalizedBox: { left: 0.78, top: 0.89, width: 0.13, height: 0.06 },
      type: 'button',
      role: 'navigation',
      action: 'navigate',
      targetPageId: 'page_2',
      locatorStrategies: [
        { id: 'loc_1', type: 'text', value: 'Messages', confidence: 0.95, enabled: true },
        {
          id: 'loc_2',
          type: 'normalized-box',
          value: { left: 0.78, top: 0.89, width: 0.13, height: 0.06 },
          confidence: 0.7,
          enabled: true,
        },
      ],
      status: 'reliable',
      confidence: 0.92,
      retryCount: 0,
    },
    element_page_1_2: {
      id: 'element_page_1_2',
      pageId: 'page_1',
      regionId: 'region_page_1_main',
      label: { primary: 'Search' },
      textCandidates: ['Search'],
      coords: [540, 200],
      bbox: [200, 140, 880, 260],
      normalizedBox: { left: 0.18, top: 0.06, width: 0.63, height: 0.05 },
      type: 'input',
      role: 'input',
      action: 'input',
      locatorStrategies: [
        { id: 'loc_3', type: 'text', value: 'Search', confidence: 0.9, enabled: true },
      ],
      status: 'reliable',
      confidence: 0.84,
      retryCount: 0,
    },
    element_page_2_1: {
      id: 'element_page_2_1',
      pageId: 'page_2',
      regionId: 'region_page_2_main',
      label: { primary: 'First conversation' },
      textCandidates: ['First conversation'],
      coords: [540, 500],
      bbox: [80, 400, 1000, 600],
      normalizedBox: { left: 0.07, top: 0.17, width: 0.85, height: 0.08 },
      type: 'list-item',
      role: 'content',
      action: 'click',
      locatorStrategies: [
        { id: 'loc_4', type: 'text', value: 'First conversation', confidence: 0.82, enabled: true },
      ],
      status: 'reliable',
      confidence: 0.8,
      retryCount: 0,
    },
    element_page_2_2: {
      id: 'element_page_2_2',
      pageId: 'page_2',
      regionId: 'region_page_2_main',
      label: { primary: 'Compose' },
      textCandidates: ['Compose'],
      coords: [960, 2100],
      bbox: [860, 2020, 1040, 2180],
      normalizedBox: { left: 0.8, top: 0.84, width: 0.17, height: 0.07 },
      type: 'button',
      role: 'action',
      action: 'click',
      locatorStrategies: [
        { id: 'loc_5', type: 'text', value: 'Compose', confidence: 0.88, enabled: true },
      ],
      status: 'reliable',
      confidence: 0.87,
      retryCount: 0,
    },
  },
  navigation: [
    {
      fromPageId: 'page_1',
      toPageId: 'page_2',
      viaElementId: 'element_page_1_1',
      confidence: 0.92,
    },
  ],
};

describe('buildRuntimeMapView', () => {
  it('builds a focused runtime slice using budget constraints', () => {
    const view = buildRuntimeMapView(MAP, RUNTIME_BUDGETS.small, {
      currentPageId: 'page_1',
      query: 'go to Messages and open the first conversation',
      preferredRoles: ['navigation', 'content'],
    });

    expect(view.currentPageCandidates[0]?.id).toBe('page_1');
    expect(view.targetPageCandidates[0]?.id).toBe('page_2');
    expect(view.pages.page_1.navigationElementIds).toContain('element_page_1_1');
    expect(view.elements.element_page_1_1.locators.length).toBeLessThanOrEqual(
      RUNTIME_BUDGETS.small.maxLocatorsPerElement,
    );
  });
});

describe('expandRuntimeMapView', () => {
  it('expands the runtime view around a focused page and element', () => {
    const base = buildRuntimeMapView(MAP, RUNTIME_BUDGETS.tiny, {
      currentPageId: 'page_1',
      query: 'go to Messages',
    });

    const expanded = expandRuntimeMapView(MAP, base, {
      addPages: 2,
      addElementsPerPage: 4,
      addLocatorsPerElement: 1,
      includeTransitions: true,
      focusPageId: 'page_2',
      focusElementId: 'element_page_1_1',
    });

    expect(Object.keys(expanded.pages)).toContain('page_2');
    expect(expanded.elements.element_page_1_1.locators.length).toBeGreaterThanOrEqual(
      base.elements.element_page_1_1.locators.length,
    );
    expect(expanded.transitions?.some((edge) => edge.toPageId === 'page_2')).toBe(true);
  });
});
