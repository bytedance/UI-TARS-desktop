/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { AdbOperator } from '@ui-tars/operator-adb';
import { loadUIMap, saveUIMap, SS_DIR } from './map-storage';
import { JumpTarget, PageMap, UIMap } from './types';
import { launchApp, adbClick, adbWake, adbHome, adbBack, adbScreenSize, sleep } from './app-launcher';
import { learnTabs } from './tab-learner';
import { learnPageElements } from './page-learner';
import {
  createEmptyUIMap,
  ensureNavigationArtifacts,
  ensureUIPage,
  syncPageArtifactsToUIMap,
} from './ui-map-sync';
import {
  deriveAppName,
  generateLandingPageName,
  generatePageName,
  generatePageId,
  generateSecondaryPageId,
  generateSecondaryPageName,
  saveScreenshot,
} from './utils';

function renameJumpTargets(
  pageMap: PageMap | undefined,
  pageName: string,
  jumpTargets: JumpTarget[],
  existingNames: string[],
): string[] {
  const targetNames = jumpTargets.map((_, idx) =>
    generateSecondaryPageName(pageName, idx + 1, existingNames),
  );

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

function persistMaps(pkg: string, uiMap: UIMap): void {
  saveUIMap(pkg, uiMap);
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
 * 1. Checks the UIMap cache (unless forceRelearn)
 * 2. Launches app, learns tabs, learns elements on each tab
 * 3. Saves the primary UIMap asset
 */
export async function autoLearnAndRun(config: AutoLearnConfig): Promise<UIMap | null> {
  const { pkg, deviceId, modelConfig, forceRelearn } = config;
  const screenWidth = config.screenWidth || 1080;
  const screenHeight = config.screenHeight || 2400;
  const maxTabs = config.maxTabs;

  // Check cache first
  if (!forceRelearn) {
    const cached = loadUIMap(pkg);
    if (cached) {
      console.log(`\n[Auto-Learn] Using cached UI map for: ${pkg}`);
      console.log(
        `  Pages: ${Object.keys(cached.pages).length}, Elements: ${Object.keys(cached.elements).length}`,
      );
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
  const uiMap = createEmptyUIMap(pkg, deviceId, deriveAppName(pkg), actualWidth, actualHeight);
  const learnedTabs = [] as Awaited<ReturnType<typeof learnTabs>>;
  const learnedPages: Record<string, PageMap> = {};
  const secondaryPageNames = new Set<string>();

  // Phase 1: Learn tabs
  try {
    const tabs = await learnTabs(op, modelConfig);
    learnedTabs.push(...tabs);
    for (const tab of tabs) {
      ensureUIPage(
        uiMap,
        generatePageId(tab.index),
        tab.name,
        1,
        'unknown',
        { type: 'hotkey', key: 'back' },
      );
    }
    for (const tab of tabs) {
      ensureNavigationArtifacts(uiMap, generatePageId(tab.index), tabs, actualWidth, actualHeight);
    }
    persistMaps(pkg, uiMap);
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
  if (learnedTabs.length === 0) {
    const landingPageName = generateLandingPageName(Object.keys(learnedPages));
    try {
      const landingResult = await learnPageElements(
        op,
        modelConfig,
        landingPageName,
        1,
        10,
        actualWidth,
        actualHeight,
        () => persistMaps(pkg, uiMap),
      );
      learnedPages[landingPageName] = landingResult.pageMap;
      const landingPageId = generatePageId(1);
      syncPageArtifactsToUIMap({
        uiMap,
        pageId: landingPageId,
        label: undefined,
        pageMap: landingResult.pageMap,
        tabs: learnedTabs,
        screenWidth: actualWidth,
        screenHeight: actualHeight,
      });
      if (landingResult.jumpTargets.length > 0) {
        const targetNames = renameJumpTargets(
          landingResult.pageMap,
          landingPageName,
          landingResult.jumpTargets,
          [...Object.keys(learnedPages), ...secondaryPageNames],
        );
        const targetNameToPageId = new Map<string, string>();
        targetNames.forEach((targetName, idx) => {
          secondaryPageNames.add(targetName);
          const targetPageId = generateSecondaryPageId(landingPageId, idx + 1);
          targetNameToPageId.set(targetName, targetPageId);
          ensureUIPage(uiMap, targetPageId, targetName, 2, 'unknown', { type: 'hotkey', key: 'back' });
        });
        syncPageArtifactsToUIMap({
          uiMap,
          pageId: landingPageId,
          label: undefined,
          pageMap: landingResult.pageMap,
          tabs: learnedTabs,
          screenWidth: actualWidth,
          screenHeight: actualHeight,
          targetNameToPageId,
        });
      }
      persistMaps(pkg, uiMap);
    } catch (err) {
      console.error('[Error learning landing page]', err);
      return null;
    }
  }

  if (learnedTabs.length > 0) {
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

  for (let t = 0; t < learnedTabs.length; t++) {
    const tab = learnedTabs[t];
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
        Object.keys(learnedPages),
      );

      const pageResult = await learnPageElements(
        op,
        modelConfig,
        pageName,
        1,
        10,
        actualWidth,
        actualHeight,
        () => persistMaps(pkg, uiMap),
      );

      learnedPages[pageName] = pageResult.pageMap;
      const pageId = generatePageId(tab.index);
      syncPageArtifactsToUIMap({
        uiMap,
        pageId,
        label: tab.name,
        pageMap: pageResult.pageMap,
        tabs: learnedTabs,
        screenWidth: actualWidth,
        screenHeight: actualHeight,
      });

      // Handle jump targets (secondary pages)
      if (pageResult.jumpTargets.length > 0) {
        const targetNames = renameJumpTargets(
          pageResult.pageMap,
          pageName,
          pageResult.jumpTargets,
          [...Object.keys(learnedPages), ...secondaryPageNames],
        );
        const targetNameToPageId = new Map<string, string>();
        targetNames.forEach((targetName, idx) => {
          secondaryPageNames.add(targetName);
          const targetPageId = generateSecondaryPageId(pageId, idx + 1);
          targetNameToPageId.set(targetName, targetPageId);
          ensureUIPage(uiMap, targetPageId, targetName, 2, 'unknown', { type: 'hotkey', key: 'back' });
        });
        syncPageArtifactsToUIMap({
          uiMap,
          pageId,
          label: tab.name,
          pageMap: pageResult.pageMap,
          tabs: learnedTabs,
          screenWidth: actualWidth,
          screenHeight: actualHeight,
          targetNameToPageId,
        });

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
      persistMaps(pkg, uiMap);
      console.log(`[Incremental save] Map saved after completing page: ${pageName}`);

      await sleep(300);

      // Limit to configured maxTabs
      if (maxTabs !== undefined && t >= maxTabs - 1) {
        if (maxTabs < learnedTabs.length) {
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
  uiMap.meta.learnTime = endTime - startTime;

  // Final save
  persistMaps(pkg, uiMap);

  console.log('\n========================================');
  console.log('LEARNING COMPLETE');
  console.log(`Time: ${((endTime - startTime) / 1000).toFixed(1)}s`);
  console.log(`Tabs: ${learnedTabs.length}`);
  console.log(`Pages: ${Object.keys(uiMap.pages).length}`);
  console.log('========================================');

  return uiMap;
}
