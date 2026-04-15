/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { GUIAgent } from '@ui-tars/sdk';
import { Operator } from '@ui-tars/sdk/core';
import { RecordingOperator } from './recording-operator';
import { TabElement } from './types';
import { extractCoords, generateTabName, DEDUP_THRESHOLD } from './utils';
import { withTimeout } from './app-launcher';

/**
 * Phase 1: Learn navigation tabs by instructing the agent to click all bottom nav tabs.
 */
export async function learnTabs(
  op: Operator,
  modelConfig: { baseURL: string; apiKey: string; model: string; useResponsesApi?: boolean },
  maxLoops = 8,
  timeoutMs = 300_000, // 5 minutes
): Promise<TabElement[]> {
  console.log('\n[Phase 1] Learning Navigation Tabs');

  const recordingOp = new RecordingOperator(op);
  const agent = new GUIAgent({
    operator: recordingOp,
    model: modelConfig,
    logger: console,
    maxLoopCount: maxLoops,
    loopIntervalInMs: 0,
  });

  await withTimeout(
    agent.run(
      '依次点击底部导航栏所有tab，从左到右。\n\n' +
        '**重要：在Thought中用【tab名称】标注你点击的tab！**\n' +
        '例如：Thought: 我要点击【首页】tab。Action: click(...)\n' +
        '例如：Thought: 我要点击【剧场】tab。Action: click(...)\n\n' +
        '点击完所有tab后回到第一个，然后执行finished()',
      [],
      {},
    ),
    timeoutMs,
    'learnTabs',
  );

  const actions = recordingOp.getActions();
  const clicks = actions.filter((a) => a.type === 'click');

  const tabs: TabElement[] = [];
  clicks.forEach((click, idx) => {
    const coords = extractCoords(click.inputs);
    const tabName = generateTabName(click.thought, idx + 1);

    tabs.push({
      index: idx + 1,
      name: tabName,
      coords,
      bbox: [],
      status: 'reliable',
    });
  });

  // Deduplicate by coordinate proximity, preserving full TabElement structure
  const seenCoords: number[][] = [];
  const uniqueTabs = tabs.filter((tab) => {
    const isDup = seenCoords.some(
      (c) =>
        tab.coords.length >= 2 &&
        c.length >= 2 &&
        Math.abs(tab.coords[0] - c[0]) < DEDUP_THRESHOLD.TAB &&
        Math.abs(tab.coords[1] - c[1]) < DEDUP_THRESHOLD.TAB,
    );
    if (isDup) return false;
    seenCoords.push(tab.coords);
    return true;
  });
  console.log(`Found ${uniqueTabs.length} unique tabs (after deduplication)`);
  return uniqueTabs;
}
