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
  saveScreenshot,
} from './utils';
import { SS_DIR } from './map-storage';
import { getLayoutType } from './page-signatures';

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
      '探索当前页面的可交互元素。\n\n' +
        '**【绝对禁止】点击屏幕顶部 1/8 区域（y坐标小于屏幕高度的 1/8）！**\n' +
        '这个区域通常是Logo、品牌名称、导航栏，不可交互。\n' +
        '你必须从屏幕中间或下半部分开始探索。\n\n' +
        '**重要：在Thought中用【元素名称】标注你点击的是什么！**\n' +
        '例如：Thought: 我要点击【推荐卡片】来查看详情。Action: click(...)\n\n' +
        '**探索规则：**\n' +
        '1. 首先观察屏幕下半部分的卡片、按钮、列表\n' +
        '2. 点击第一个看起来有功能的元素（如推荐卡片、角色列表项）\n' +
        '3. 用【名称】标注元素，如【推荐卡片】【签到按钮】【角色卡片】\n' +
        '4. 点击后如果进入新页面，立即hotkey(key="back")返回\n' +
        '5. 如果出现弹窗，关闭后换下一个元素\n' +
        '6. 向上滚动探索更多内容\n' +
        '7. 探索完 5-8 个主要元素后执行 finished()\n\n' +
        '**记住：目标是发现有功能的交互元素！从屏幕中间开始，不要点击顶部！**',
      [],
      {},
    ),
    600_000, // 10 minutes
    'learnPageElements',
  );

  const actions = recordingOp.getActions();
  const clicks = actions.filter((a) => a.type === 'click');
  const scrolls = actions.filter((a) => a.type === 'scroll');
  const backs = actions.filter((a) => a.type === 'hotkey' && a.inputs.key === 'back');

  const elements: Array<{
    id: string;
    name: string;
    description: string;
    coords: number[];
    bbox: number[];
    type: string;
    action: string;
    status: 'reliable' | 'unreliable';
    retryCount: number;
    target?: string;
  }> = [];
  const jumpTargets: JumpTarget[] = [];
  let jumpIdx = 0;
  let filteredCount = 0;
  const TOP_REGION_THRESHOLD = Math.floor(screenHeight / 8);

  for (const click of clicks) {
    const coords = extractCoords(click.inputs);

    // Filter clicks in the top region (likely nav bar/logo)
    if (coords.length >= 2 && coords[1] < TOP_REGION_THRESHOLD) {
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

    const yPos = coords.length >= 2 ? Math.round(coords[1]) : 0;
    const positionDesc =
      yPos < 800 ? '上部区域' : yPos < 1600 ? '中部区域' : '下部区域';

    const elem: {
      id: string;
      name: string;
      description: string;
      coords: number[];
      bbox: number[];
      type: string;
      action: string;
      status: 'reliable' | 'unreliable';
      retryCount: number;
      target?: string;
    } = {
      id: elemId,
      name: elementName,
      description: `${elementName} - 位于${positionDesc}，${click.thought.substring(0, 80)}`,
      coords,
      bbox: [],
      type: elemType,
      action: guessActionType(click.thought, pageChanged),
      status: 'reliable' as const,
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
      `[Filter] Filtered out ${filteredCount} clicks in top region (y < ${TOP_REGION_THRESHOLD})`,
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
      elements: uniqueElements as Element[],
      description: 'Main content area',
    });
  }

  const pageMap: PageMap = {
    name: pageName,
    depth,
    layout: getLayoutType(pageName),
    regions,
    backAction: { type: 'hotkey', key: 'back' },
  };

  console.log(`Found ${uniqueElements.length} elements, ${jumpTargets.length} jump targets`);
  return { pageMap, jumpTargets };
}
