/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import type { AppMap, UIElement, UIMap, UIPage, UIRegion } from './types';
import { UI_MAP_SCHEMA_VERSION } from './types';
import {
  buildLocatorStrategies,
  deriveElementRole,
  extractLearnedLabel,
  generateElementStableId,
  generatePageId,
  generateRegionId,
  toNormalizedBox,
  toNormalizedPointBox,
} from './utils';

export function createEmptyUIMap(
  pkg: string,
  deviceId: string,
  appName: string,
  screenWidth: number,
  screenHeight: number,
): UIMap {
  return {
    meta: {
      schemaVersion: UI_MAP_SCHEMA_VERSION,
      appId: pkg,
      appName,
      platform: 'android',
      screenWidth,
      screenHeight,
      learnTime: 0,
      learnDate: new Date().toISOString(),
      device: deviceId,
    },
    pages: {},
    regions: {},
    elements: {},
    navigation: [],
  };
}

export function ensureUIPage(
  uiMap: UIMap,
  pageId: string,
  label: string | undefined,
  depth: number,
  layout: UIPage['layout'],
  backAction: UIPage['backAction'],
): UIPage {
  if (!uiMap.pages[pageId]) {
    uiMap.pages[pageId] = {
      id: pageId,
      label: label ? { primary: label, aliases: [] } : undefined,
      depth,
      layout,
      status: 'reliable',
      confidence: 0.8,
      regionIds: [],
      signatureTexts: label ? [label] : [],
      anchorElementIds: [],
      backAction,
    };
  } else if (label && !uiMap.pages[pageId].label?.primary) {
    uiMap.pages[pageId].label = { primary: label, aliases: [] };
  }

  return uiMap.pages[pageId];
}

export function addNavigationEdge(
  uiMap: UIMap,
  fromPageId: string,
  toPageId: string,
  viaElementId: string,
  confidence = 0.85,
): void {
  const existing = uiMap.navigation.find(
    (edge) =>
      edge.fromPageId === fromPageId &&
      edge.toPageId === toPageId &&
      edge.viaElementId === viaElementId,
  );
  if (!existing) {
    uiMap.navigation.push({
      fromPageId,
      toPageId,
      viaElementId,
      confidence,
    });
  }
}

export function ensureNavigationArtifacts(
  uiMap: UIMap,
  pageId: string,
  tabs: AppMap['navigation']['tabs'],
  screenWidth: number,
  screenHeight: number,
): void {
  if (tabs.length === 0) return;

  const page = uiMap.pages[pageId];
  const navRegionId = generateRegionId(pageId, 'navigation');
  if (!uiMap.regions[navRegionId]) {
    uiMap.regions[navRegionId] = {
      id: navRegionId,
      pageId,
      position: 'bottom',
      bbox: [0, 0, screenWidth, screenHeight],
      normalizedBox: { left: 0, top: 0, width: 1, height: 1 },
      type: 'static',
      scrollable: false,
      elementIds: [],
      description: 'Persistent navigation region',
    };
  }
  if (!page.regionIds.includes(navRegionId)) {
    page.regionIds.push(navRegionId);
  }

  for (const tab of tabs) {
    const elementId = `nav_${pageId}_${tab.index}`;
    const targetPageId = generatePageId(tab.index);
    ensureUIPage(uiMap, targetPageId, tab.name, 1, 'unknown', { type: 'hotkey', key: 'back' });

    if (!uiMap.elements[elementId]) {
      const label = extractLearnedLabel(`【${tab.name}】`) || { primary: tab.name, aliases: [] };
      const normalizedBox =
        tab.bbox.length >= 4
          ? toNormalizedBox(tab.bbox, screenWidth, screenHeight)
          : toNormalizedPointBox(tab.coords, screenWidth, screenHeight);
      uiMap.elements[elementId] = {
        id: elementId,
        pageId,
        regionId: navRegionId,
        label,
        textCandidates: label.primary ? [label.primary] : [],
        coords: tab.coords,
        bbox: tab.bbox,
        normalizedBox,
        type: 'button',
        role: 'navigation',
        action: 'navigate',
        targetPageId,
        locatorStrategies: buildLocatorStrategies({
          elementId,
          label,
          textCandidates: label.primary ? [label.primary] : [],
          normalizedBox,
        }),
        status: tab.status,
        confidence: 0.88,
        retryCount: 0,
      };
    }

    if (!uiMap.regions[navRegionId].elementIds.includes(elementId)) {
      uiMap.regions[navRegionId].elementIds.push(elementId);
    }
    addNavigationEdge(uiMap, pageId, targetPageId, elementId);
  }
}

export function syncPageArtifactsToUIMap(params: {
  uiMap: UIMap;
  pageId: string;
  label: string | undefined;
  pageMap: AppMap['pages'][string];
  tabs: AppMap['navigation']['tabs'];
  screenWidth: number;
  screenHeight: number;
  targetNameToPageId?: Map<string, string>;
}): void {
  const {
    uiMap,
    pageId,
    label,
    pageMap,
    tabs,
    screenWidth,
    screenHeight,
    targetNameToPageId,
  } = params;

  const uiPage = ensureUIPage(
    uiMap,
    pageId,
    label,
    pageMap.depth,
    pageMap.layout,
    pageMap.backAction,
  );
  uiPage.layout = pageMap.layout;
  uiPage.backAction = pageMap.backAction;
  uiPage.signatureTexts = label ? [label] : uiPage.signatureTexts;

  ensureNavigationArtifacts(uiMap, pageId, tabs, screenWidth, screenHeight);

  let elementIndex = 1;
  for (const region of pageMap.regions) {
    const regionId = generateRegionId(pageId, region.id || `region_${uiPage.regionIds.length + 1}`);
    const normalizedRegionBox =
      region.bbox.length >= 4
        ? toNormalizedBox(region.bbox, screenWidth, screenHeight)
        : undefined;

    if (!uiMap.regions[regionId]) {
      uiMap.regions[regionId] = {
        id: regionId,
        pageId,
        position: region.position,
        bbox: region.bbox,
        normalizedBox: normalizedRegionBox,
        type: region.type,
        scrollable: region.scrollable,
        elementIds: [],
        description: region.description,
      };
    } else {
      uiMap.regions[regionId] = {
        ...uiMap.regions[regionId],
        bbox: region.bbox,
        normalizedBox: normalizedRegionBox,
        type: region.type,
        scrollable: region.scrollable,
        description: region.description,
      };
    }

    if (!uiPage.regionIds.includes(regionId)) {
      uiPage.regionIds.push(regionId);
    }

    uiMap.regions[regionId].elementIds = [];

    for (const element of region.elements) {
      const elementId = generateElementStableId(pageId, elementIndex++);
      const labelValue = element.name || element.text;
      const learnedLabel = labelValue ? { primary: labelValue, aliases: [] } : undefined;
      const normalizedBox =
        element.bbox.length >= 4
          ? toNormalizedBox(element.bbox, screenWidth, screenHeight)
          : toNormalizedPointBox(element.coords, screenWidth, screenHeight);
      const textCandidates = [element.name, element.text].filter(
        (value): value is string => Boolean(value),
      );
      const targetPageId = element.target ? targetNameToPageId?.get(element.target) : undefined;

      const uiElement: UIElement = {
        id: elementId,
        pageId,
        regionId,
        label: learnedLabel,
        textCandidates,
        coords: element.coords,
        bbox: element.bbox,
        normalizedBox,
        type: element.type,
        role: deriveElementRole(element.type, element.action),
        action: element.action,
        targetPageId,
        locatorStrategies: buildLocatorStrategies({
          elementId,
          label: learnedLabel,
          textCandidates,
          normalizedBox,
        }),
        status: element.status,
        confidence: element.status === 'reliable' ? 0.82 : 0.6,
        retryCount: element.retryCount,
        lastError: element.lastError,
        screenshotBefore: element.screenshotBefore,
        screenshotAfter: element.screenshotAfter,
        description: element.description,
      };
      uiMap.elements[elementId] = uiElement;
      uiMap.regions[regionId].elementIds.push(elementId);

      if (targetPageId) {
        addNavigationEdge(uiMap, pageId, targetPageId, elementId, 0.8);
      }
    }
  }
}
