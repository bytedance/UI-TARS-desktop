/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
// Compatibility bridge for legacy AppMap fixtures and migration-oriented tests.
import type { AppMap, PageMap, UIElement, UIMap, UIPage, UIRegion } from '../types';
import { UI_MAP_SCHEMA_VERSION } from '../types';
import {
  buildLocatorStrategies,
  deriveElementRole,
  extractLearnedLabel,
  generateElementStableId,
  generatePageId,
  generateRegionId,
  generateSecondaryPageId,
  toNormalizedBox,
  toNormalizedPointBox,
} from '../utils';

type PageMapping = {
  legacyName: string;
  pageId: string;
  pageMap: PageMap;
};

function buildTopLevelPageMappings(map: AppMap): PageMapping[] {
  return Object.entries(map.pages).map(([legacyName, pageMap], idx) => ({
    legacyName,
    pageId: generatePageId(idx + 1),
    pageMap,
  }));
}

function buildSecondaryPageMappings(
  map: AppMap,
  topLevelMappings: PageMapping[],
): PageMapping[] {
  const mappings: PageMapping[] = [];
  const assigned = new Set<string>();
  const topLevelNameToId = new Map(topLevelMappings.map((mapping) => [mapping.legacyName, mapping.pageId]));

  for (const [sourceName, targets] of Object.entries(map.navigationGraph)) {
    const sourcePageId = topLevelNameToId.get(sourceName);
    if (!sourcePageId) continue;

    targets.forEach((targetName, idx) => {
      if (topLevelNameToId.has(targetName) || assigned.has(targetName)) return;
      mappings.push({
        legacyName: targetName,
        pageId: generateSecondaryPageId(sourcePageId, idx + 1),
        pageMap: map.secondaryPages?.[targetName] || {
          name: targetName,
          depth: 2,
          layout: 'unknown',
          regions: [],
        },
      });
      assigned.add(targetName);
    });
  }

  return mappings;
}

export function buildUIMapFromLegacyMap(map: AppMap): UIMap {
  const topLevelMappings = buildTopLevelPageMappings(map);
  const secondaryMappings = buildSecondaryPageMappings(map, topLevelMappings);
  const allMappings = [...topLevelMappings, ...secondaryMappings];
  const legacyNameToPageId = new Map(allMappings.map((mapping) => [mapping.legacyName, mapping.pageId]));

  const uiMap: UIMap = {
    meta: {
      schemaVersion: UI_MAP_SCHEMA_VERSION,
      appId: map.meta.package,
      appName: map.meta.appName,
      platform: 'android',
      screenWidth: map.meta.screenWidth,
      screenHeight: map.meta.screenHeight,
      learnTime: map.meta.learnTime,
      learnDate: map.meta.learnDate,
      device: map.meta.device,
    },
    pages: {},
    regions: {},
    elements: {},
    navigation: [],
  };
  const targetKeyToElementId = new Map<string, string>();

  for (const mapping of allMappings) {
    const uiPage: UIPage = {
      id: mapping.pageId,
      label: { primary: mapping.legacyName, aliases: [] },
      depth: mapping.pageMap.depth,
      layout: mapping.pageMap.layout,
      status: 'reliable',
      confidence: 0.85,
      regionIds: [],
      signatureTexts: mapping.legacyName ? [mapping.legacyName] : [],
      anchorElementIds: [],
      backAction: mapping.pageMap.backAction,
    };
    uiMap.pages[mapping.pageId] = uiPage;
  }

  for (const mapping of allMappings) {
    const pageId = mapping.pageId;
    let elementIndex = 1;

    if (topLevelMappings.length > 0) {
      const navRegionId = generateRegionId(pageId, 'navigation');
      const navRegion: UIRegion = {
        id: navRegionId,
        pageId,
        position: 'bottom',
        bbox: [0, 0, map.meta.screenWidth, map.meta.screenHeight],
        normalizedBox: { left: 0, top: 0, width: 1, height: 1 },
        type: 'static',
        scrollable: false,
        elementIds: [],
        description: 'Persistent navigation region',
      };

      for (const tab of map.navigation.tabs) {
        const targetPageId = topLevelMappings.find((candidate) => candidate.legacyName === tab.name)?.pageId
          ?? generatePageId(tab.index);
        const elementId = `nav_${pageId}_${tab.index}`;
        const normalizedBox = tab.bbox.length >= 4
          ? toNormalizedBox(tab.bbox, map.meta.screenWidth, map.meta.screenHeight)
          : toNormalizedPointBox(tab.coords, map.meta.screenWidth, map.meta.screenHeight);
        const label = extractLearnedLabel(`【${tab.name}】`) || { primary: tab.name, aliases: [] };

        const navElement: UIElement = {
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

        uiMap.elements[elementId] = navElement;
        navRegion.elementIds.push(elementId);
        if (targetPageId) {
          targetKeyToElementId.set(`${pageId}->${targetPageId}`, elementId);
        }
      }

      uiMap.regions[navRegionId] = navRegion;
      uiMap.pages[pageId].regionIds.push(navRegionId);
    }

    mapping.pageMap.regions.forEach((region, regionIdx) => {
      const regionId = generateRegionId(pageId, region.id || `region_${regionIdx + 1}`);
      const uiRegion: UIRegion = {
        id: regionId,
        pageId,
        position: region.position,
        bbox: region.bbox,
        normalizedBox: toNormalizedBox(region.bbox, map.meta.screenWidth, map.meta.screenHeight),
        type: region.type,
        scrollable: region.scrollable,
        elementIds: [],
        description: region.description,
      };

      region.elements.forEach((element) => {
        const elementId = generateElementStableId(pageId, elementIndex++);
        const labelPrimary = element.name || element.text;
        const label = labelPrimary ? { primary: labelPrimary, aliases: [] } : undefined;
        const normalizedBox = element.bbox.length >= 4
          ? toNormalizedBox(element.bbox, map.meta.screenWidth, map.meta.screenHeight)
          : toNormalizedPointBox(element.coords, map.meta.screenWidth, map.meta.screenHeight);
        const textCandidates = [element.name, element.text].filter((value): value is string => Boolean(value));
        const targetPageId = element.target ? legacyNameToPageId.get(element.target) : undefined;

        const uiElement: UIElement = {
          id: elementId,
          pageId,
          regionId,
          label,
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
            label,
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
        uiRegion.elementIds.push(elementId);
        if (targetPageId) {
          targetKeyToElementId.set(`${pageId}->${targetPageId}`, elementId);
        }
      });

      uiMap.regions[regionId] = uiRegion;
      uiMap.pages[pageId].regionIds.push(regionId);
    });
  }

  for (const [sourceName, targetNames] of Object.entries(map.navigationGraph)) {
    const fromPageId = legacyNameToPageId.get(sourceName);
    if (!fromPageId) continue;

    targetNames.forEach((targetName, idx) => {
      const toPageId = legacyNameToPageId.get(targetName);
      if (!toPageId) return;

      uiMap.navigation.push({
        fromPageId,
        toPageId,
        viaElementId: targetKeyToElementId.get(`${fromPageId}->${toPageId}`) || `edge_${fromPageId}_${idx + 1}`,
        confidence: 0.8,
      });
    });
  }

  return uiMap;
}
