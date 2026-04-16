/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { AdbOperator } from '@ui-tars/operator-adb';
import { loadMap, saveMap, SS_DIR } from './map-storage';
import { AppMap, JumpTarget } from './types';
import { launchApp, adbClick, adbWake, adbHome, adbBack, adbScreenSize, sleep } from './app-launcher';
import { learnTabs } from './tab-learner';
import { learnPageElements } from './page-learner';
import {
  deriveAppName,
  generateLandingPageName,
  generatePageName,
  generateSecondaryPageName,
  saveScreenshot,
} from './utils';

function renameJumpTargets(
  map: AppMap,
  pageName: string,
  jumpTargets: JumpTarget[],
): string[] {
  const existingNames = [
    ...Object.keys(map.pages),
    ...Object.keys(map.secondaryPages || {}),
  ];

  const targetNames = jumpTargets.map((_, idx) =>
    generateSecondaryPageName(pageName, idx + 1, existingNames),
  );

  const pageMap = map.pages[pageName];
  if (!pageMap) {
    return targetNames;
  }

  for (const region of pageMap.regions) {
    for (const element of region.elements) {
      const match = element.target?.match(/^SecondaryPage_(\d+)$/);
      const targetIndex = match ? Number.parseInt(match[1], 10) - 1 : -1;
      if (targetIndex >= 0 && targetIndex < targetNames.length) {
        element.target = targetNames[targetIndex];
      }
    }
  }

  return targetNames;
}

export interface AutoLearnConfig {
  /** Android app package name */
  pkg: string;
  /** ADB device ID */
  deviceId: string;
  /** VLM model configuration */
  modelConfig: {
    baseURL: string;
    apiKey: string;
    model: string;
    useResponsesApi?: boolean;
  };
  /** Force re-learning even if a cached map exists */
  forceRelearn?: boolean;
  /** Screen physical width (default 1080) */
  screenWidth?: number;
  /** Screen physical height (default 2400) */
  screenHeight?: number;
  /** Maximum number of navigation items to learn; omit to explore all discovered items */
  maxTabs?: number;
}

/**
 * Main orchestrator for the auto-learn feature.
 * 1. Checks cache (unless forceRelearn)
 * 2. Launches app, learns tabs, learns elements on each tab
 * 3. Saves the resulting AppMap
 */
export async function autoLearnAndRun(config: AutoLearnConfig): Promise<AppMap | null> {
  const { pkg, deviceId, modelConfig, forceRelearn } = config;
  const screenWidth = config.screenWidth || 1080;
  const screenHeight = config.screenHeight || 2400;
  const maxTabs = config.maxTabs;

  // Check cache first
  if (!forceRelearn) {
    const cached = loadMap(pkg);
    if (cached) {
      console.log(`\n[Auto-Learn] Using cached app map for: ${pkg}`);
      console.log(`  Tabs: ${cached.navigation.tabs.length}`);
      console.log(`  Pages: ${Object.keys(cached.pages).length}`);
      return cached;
    }
  } else {
    console.log(`\n[Auto-Learn] Force re-learning enabled, ignoring cache for: ${pkg}`);
  }

  console.log('\n========================================');
  console.log('DEEP APP LEARNING');
  console.log(`Package: ${pkg}`);
  console.log(`Device: ${deviceId}`);
  console.log('========================================');

  const startTime = Date.now();

  // Wake device, go home, launch app
  try {
    adbWake(deviceId);
  } catch {
    // ignore - device may already be awake
  }

  try {
    adbHome(deviceId);
  } catch (err) {
    console.error('[Error] Failed to send home:', err);
    return null;
  }
  await sleep(1000);

  try {
    launchApp(deviceId, pkg);
  } catch (err) {
    console.error('[Error] Failed to launch app:', err);
    return null;
  }
  await sleep(3000);

  // Create ADB operator
  const op = new AdbOperator(deviceId);

  // Verify app launched with a screenshot
  let initialSS;
  try {
    initialSS = await op.screenshot();
  } catch {
    console.log('ERROR: App failed to launch or screenshot');
    return null;
  }

  if (!initialSS?.base64) {
    console.log('ERROR: App failed to launch (empty screenshot)');
    return null;
  }

  // Query actual screen dimensions, fallback to config defaults
  const actualSize = adbScreenSize(deviceId);
  const actualWidth = actualSize?.width || screenWidth;
  const actualHeight = actualSize?.height || screenHeight;
  console.log(`App launched: ${actualWidth}x${actualHeight}`);
  saveScreenshot(initialSS.base64, 'launch', SS_DIR);

  // Initialize empty map structure
  const map: AppMap = {
    meta: {
      appName: deriveAppName(pkg),
      package: pkg,
      screenWidth: actualWidth,
      screenHeight: actualHeight,
      learnTime: 0,
      learnDate: new Date().toISOString(),
      device: deviceId,
    },
    navigation: { tabs: [], topButtons: [] },
    pages: {},
    secondaryPages: {},
    navigationGraph: {},
  };

  // Phase 1: Learn tabs
  try {
    const tabs = await learnTabs(op, modelConfig);
    map.navigation.tabs = tabs;
    saveMap(pkg, map);
    if (tabs.length === 0) {
      console.log('[Phase 1 Complete] No persistent navigation items discovered, using the current screen as the landing page');
    } else {
      console.log(`[Phase 1 Complete] ${tabs.length} navigation items discovered`);
    }
  } catch (err) {
    console.error('[Phase 1 Error] Failed to learn tabs:', err);
    return null;
  }

  // Phase 2: Learn elements on each tab
  if (map.navigation.tabs.length === 0) {
    const landingPageName = generateLandingPageName(Object.keys(map.pages));
    try {
      const landingResult = await learnPageElements(
        op,
        modelConfig,
        landingPageName,
        1,
        map,
        pkg,
        10,
        actualWidth,
        actualHeight,
        (partialMap) => saveMap(pkg, partialMap),
      );
      map.pages[landingPageName] = landingResult.pageMap;
      if (landingResult.jumpTargets.length > 0) {
        map.navigationGraph[landingPageName] = renameJumpTargets(
          map,
          landingPageName,
          landingResult.jumpTargets,
        );
      }
      saveMap(pkg, map);
    } catch (err) {
      console.error('[Error learning landing page]', err);
      return null;
    }
  }

  if (map.navigation.tabs.length > 0) {
    // Restart app to ensure we are in the target app
    console.log('\nRestarting app to ensure we are in target app...');
    try {
      launchApp(deviceId, pkg);
    } catch (err) {
      console.error('[Error] Failed to restart app:', err);
      return null;
    }
    await sleep(3000);
  }

  for (let t = 0; t < map.navigation.tabs.length; t++) {
    const tab = map.navigation.tabs[t];
    if (tab.coords.length < 2) continue;

    console.log(`\nNavigating to Tab ${tab.index}`);
    const clickX = Math.round(tab.coords[0]);
    const clickY = Math.round(tab.coords[1]);

    try {
      adbClick(deviceId, clickX, clickY);
      await sleep(500);

      const pageSS = await op.screenshot();
      if (pageSS?.base64) {
        saveScreenshot(pageSS.base64, `tab_${tab.index}_page`, SS_DIR);
      }

      const pageName = generatePageName(
        tab.name,
        tab.index,
        Object.keys(map.pages),
      );

      const pageResult = await learnPageElements(
        op,
        modelConfig,
        pageName,
        1,
        map,
        pkg,
        10,
        actualWidth,
        actualHeight,
        (partialMap) => saveMap(pkg, partialMap),
      );

      map.pages[pageName] = pageResult.pageMap;

      // Handle jump targets (secondary pages)
      if (pageResult.jumpTargets.length > 0) {
        const targetNames = renameJumpTargets(map, pageName, pageResult.jumpTargets);
        map.navigationGraph[pageName] = targetNames;

        // Explore the first secondary page
        const firstJump = pageResult.jumpTargets[0];
        if (firstJump?.coords) {
          console.log(`\n[Phase 3] Exploring Secondary Page from ${pageName}`);
          adbClick(deviceId, Math.round(firstJump.coords[0]), Math.round(firstJump.coords[1]));
          await sleep(2000);

          const enterSS = await op.screenshot();
          if (enterSS?.base64) {
            saveScreenshot(enterSS.base64, `${targetNames[0]}_enter`, SS_DIR);
          }

          // Go back
          adbBack(deviceId);
          await sleep(500);
        }
      }

      // Incremental save after each page
      saveMap(pkg, map);
      console.log(`[Incremental save] Map saved after completing page: ${pageName}`);

      await sleep(300);

      // Limit to configured maxTabs
      if (maxTabs !== undefined && t >= maxTabs - 1) {
        if (maxTabs < map.navigation.tabs.length) {
          console.log(`[Limit] Only processing first ${maxTabs} tabs for faster learning`);
        }
        break;
      }
    } catch (err) {
      console.error(`[Error learning tab ${t}]`, err);
      continue;
    }
  }

  const endTime = Date.now();
  map.meta.learnTime = endTime - startTime;

  // Final save
  saveMap(pkg, map);

  console.log('\n========================================');
  console.log('LEARNING COMPLETE');
  console.log(`Time: ${((endTime - startTime) / 1000).toFixed(1)}s`);
  console.log(`Tabs: ${map.navigation.tabs.length}`);
  console.log(`Pages: ${Object.keys(map.pages).length}`);
  console.log('========================================');

  return map;
}
