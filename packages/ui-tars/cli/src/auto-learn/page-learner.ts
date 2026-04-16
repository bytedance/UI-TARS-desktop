/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { GUIAgent } from '@ui-tars/sdk';
import { Operator } from '@ui-tars/sdk/core';
import { RecordingOperator } from './recording-operator';
import { AppMap, JumpTarget, PageMap, Region, Element } from './types';
import { withTimeout } from './app-launcher';
import {
  extractCoords,
  extractElementName,
  guessElementType,
  guessActionType,
  generateElementId,
  deduplicateElements,
  describeVerticalPosition,
  saveScreenshot,
} from './utils';
import { SS_DIR } from './map-storage';
import { getLayoutType } from './page-signatures';

const CLICK_SAVE_INTERVAL = 5;
const TOP_REGION_RATIO = 8;
const DEFAULT_PAGE_LEARN_TIMEOUT_MS = 600_000;

function createEmptyPageMap(pageName: string, depth: number): PageMap {
  return {
    name: pageName,
    depth,
    layout: getLayoutType(pageName),
    regions: [],
    backAction: { type: 'hotkey', key: 'back' },
  };
}

/**
 * Phase 2: Learn page elements by instructing the agent to explore interactive elements.
 */
export async function learnPageElements(
  op: Operator,
  modelConfig: { baseURL: string; apiKey: string; model: string; useResponsesApi?: boolean },
  pageName: string,
  depth: number,
  map: AppMap,
  pkg: string,
  maxLoops = 10,
  screenWidth = 1080,
  screenHeight = 2400,
  onIncrementalSave?: (partialMap: AppMap) => void,
): Promise<{ pageMap: PageMap; jumpTargets: JumpTarget[] }> {
  console.log(`\n[Phase 2] Learning Page: ${pageName} (depth=${depth})`);

  const recordingOp = new RecordingOperator(op);

  // Incremental save callback: trigger every 5 clicks
  let lastSaveCount = 0;
  const checkAndSave = async () => {
    const currentClicks = recordingOp.getActions().filter((a) => a.type === 'click');
    if (currentClicks.length >= lastSaveCount + 5) {
      lastSaveCount = currentClicks.length;
      if (!map.pages[pageName]) {
        map.pages[pageName] = {
          name: pageName,
          depth,
          layout: getLayoutType(pageName),
          regions: [],
          backAction: { type: 'hotkey', key: 'back' },
        };
      }
      onIncrementalSave?.(map);
      console.log(`[Incremental save] Map saved after ${currentClicks.length} clicks on ${pageName}`);
    }
  };

  // Wrap execute to call checkAndSave
  const originalExecute = recordingOp.execute.bind(recordingOp);
  recordingOp.execute = async (params) => {
    const res = await originalExecute(params);
    await checkAndSave();
    return res;
  };

  const agent = new GUIAgent({
    operator: recordingOp,
    model: modelConfig,
    logger: console,
    maxLoopCount: maxLoops,
    loopIntervalInMs: 0,
  });

  await withTimeout(
    agent.run(
      'Explore the interactive elements on the current page.\n\n' +
        `**Do not click inside the top ${1}/${TOP_REGION_RATIO} of the screen (y < screen height / ${TOP_REGION_RATIO}).**\n` +
        'That region often contains status bars, branding, or non-essential headers.\n' +
        'Start from the middle or lower content area.\n\n' +
        '**Important: in Thought, label each clicked target using 【label】 or "label".**\n' +
        'Example: Thought: I will click 【featured card】 to inspect it. Action: click(...)\n\n' +
        '**Exploration rules:**\n' +
        '1. Observe cards, buttons, lists, and inputs in the main content area first\n' +
        '2. Click the first likely interactive target\n' +
        '3. Label the target clearly, for example 【featured card】, 【primary button】, or "search input"\n' +
        '4. If the click opens a new page, call hotkey(key="back") immediately to return\n' +
        '5. If a dialog or modal appears, close it and continue with another target\n' +
        '6. Scroll upward to discover more content when needed\n' +
        '7. After exploring 5-8 major interactive targets, call finished()\n\n' +
        '**Goal: identify functional interactive elements without relying on app-specific labels.**',
      [],
      {},
    ),
    DEFAULT_PAGE_LEARN_TIMEOUT_MS,
    'learnPageElements',
  );

  const actions = recordingOp.getActions();
  const clicks = actions.filter((a) => a.type === 'click');
  const scrolls = actions.filter((a) => a.type === 'scroll');
  const backs = actions.filter((a) => a.type === 'hotkey' && a.inputs.key === 'back');

  const elements: Element[] = [];
  const jumpTargets: JumpTarget[] = [];
  let jumpIdx = 0;
  let filteredCount = 0;
  const topRegionThreshold = Math.floor(screenHeight / TOP_REGION_RATIO);

  for (const click of clicks) {
    const coords = extractCoords(click.inputs);

    // Filter clicks in the top region (likely nav bar/logo)
    if (coords.length >= 2 && coords[1] < topRegionThreshold) {
      filteredCount++;
      continue;
    }

    const elementName = extractElementName(click.thought);
    const elemType = guessElementType(click.thought);

    const sameNameCount = elements.filter((e) => e.name === elementName).length;
    const elemId = generateElementId(
      pageName,
      elementName,
      elements.length + 1,
      elemType,
      sameNameCount,
    );

    const pageChanged = backs.some(
      (b) => b.loopIndex > click.loopIndex && b.loopIndex < click.loopIndex + 5,
    );

    const yPos = coords.length >= 2 ? Math.round(coords[1]) : -1;
    const positionDesc = describeVerticalPosition(yPos, screenHeight);

    const elem: Element = {
      id: elemId,
      name: elementName,
      description: `${elementName} - located in the ${positionDesc}, ${click.thought.substring(0, 80)}`,
      coords,
      bbox: [],
      type: elemType,
      action: guessActionType(click.thought, pageChanged),
      status: 'reliable',
      retryCount: 0,
    };

    if (pageChanged && elem.action === 'navigate') {
      elem.target = `SecondaryPage_${jumpIdx + 1}`;
      jumpTargets.push({
        elementId: elem.id,
        coords,
        screenshotBefore: click.screenshotBefore,
      });
      jumpIdx++;
    }

    elements.push(elem);

    if (click.screenshotBefore) {
      saveScreenshot(click.screenshotBefore, `${elemId}_click`, SS_DIR);
    }
  }

  if (filteredCount > 0) {
    console.log(
      `[Filter] Filtered out ${filteredCount} clicks in top region (y < ${topRegionThreshold})`,
    );
  }

  const uniqueElements = deduplicateElements(elements, 60);
  console.log(`[Dedup] After deduplication: ${uniqueElements.length} unique elements`);

  const regions: Region[] = [];
  if (uniqueElements.length > 0) {
    regions.push({
      id: `${pageName}_main`,
      position: 'full',
      bbox: [0, 0, screenWidth, screenHeight],
      type: scrolls.length > 0 ? 'scrollable-grid' : 'static',
      scrollable: scrolls.length > 0,
      elements: uniqueElements,
      description: 'Main content area',
    });
  }

  const pageMap: PageMap = {
    ...createEmptyPageMap(pageName, depth),
    regions,
  };

  console.log(`Found ${uniqueElements.length} elements, ${jumpTargets.length} jump targets`);
  return { pageMap, jumpTargets };
}
