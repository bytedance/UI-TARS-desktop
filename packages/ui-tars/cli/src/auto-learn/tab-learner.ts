/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { GUIAgent } from '@ui-tars/sdk';
import { Operator } from '@ui-tars/sdk/core';
import { RecordingOperator } from './recording-operator';
import { TabElement } from './types';
import { extractActionBbox, extractCoords, generateTabName, DEDUP_THRESHOLD } from './utils';
import { withTimeout } from './app-launcher';

/**
 * Phase 1: Learn primary navigation items by instructing the agent to click unique nav targets.
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
      'Explore the app\'s primary navigation items.\n\n' +
        'Look for persistent navigation controls, typically along the bottom, top, or side edges.\n' +
        '**Important: in Thought, label each clicked navigation target using 【label】 or "label".**\n' +
        'Example: Thought: I will click 【Discover】 navigation item. Action: click(...)\n' +
        'Example: Thought: I will click "Profile" navigation item. Action: click(...)\n\n' +
        'Click each unique primary navigation target once. After exploring them, return to the first one and call finished().',
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
    const bbox = extractActionBbox(click.inputs);
    const tabName = generateTabName(click.thought, idx + 1);

    tabs.push({
      index: idx + 1,
      name: tabName,
      coords,
      bbox,
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
