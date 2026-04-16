/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import fs from 'node:fs';
import path from 'node:path';
import type {
  Element,
  ElementAction,
  ElementRole,
  ElementType,
  LearnedLabel,
  LocatorStrategy,
  NormalizedBox,
} from './types';

/** Deduplication thresholds */
export const DEDUP_THRESHOLD = {
  TAB: 80,
  ELEMENT: 60,
};

/**
 * Extract [x, y] coordinates from action inputs
 */
export function extractCoords(
  inputs: Record<string, unknown>,
): number[] {
  if (inputs.start_coords && Array.isArray(inputs.start_coords) && inputs.start_coords.length >= 2) {
    return inputs.start_coords as number[];
  }
  return [];
}

/**
 * Parse bbox string like "[x1, y1, x2, y2]" to number array
 */
export function parseBbox(bboxStr: string): number[] {
  if (!bboxStr) return [];
  const match = bboxStr.match(/\[([0-9., ]+)\]/);
  if (!match) return [];
  return match[1].split(',').map((s) => Number.parseFloat(s.trim()));
}

export function extractActionBbox(inputs: Record<string, unknown>): number[] {
  if (typeof inputs.start_box !== 'string') {
    return [];
  }
  return parseBbox(inputs.start_box);
}

/**
 * Guess element type from VLM thought string
 */
export function guessElementType(
  thought: string,
): ElementType {
  const lower = thought.toLowerCase();
  if (lower.includes('按钮') || lower.includes('button')) return 'button';
  if (lower.includes('卡片') || lower.includes('card')) return 'card';
  if (lower.includes('列表') || lower.includes('list') || lower.includes('item')) return 'list-item';
  if (lower.includes('输入') || lower.includes('input') || lower.includes('框')) return 'input';
  if (lower.includes('图标') || lower.includes('icon')) return 'icon';
  if (lower.includes('tab') || lower.includes('导航')) return 'button';
  if (lower.includes('弹窗') || lower.includes('dialog')) return 'button';
  if (lower.includes('链接') || lower.includes('link')) return 'button';
  return 'unknown';
}

/**
 * Guess action type from thought and whether page changed
 */
export function guessActionType(
  thought: string,
  pageChanged: boolean,
): Element['action'] {
  const lower = thought.toLowerCase();
  if (pageChanged) return 'navigate';
  if (lower.includes('筛选') || lower.includes('过滤') || lower.includes('filter')) return 'filter';
  if (lower.includes('切换') || lower.includes('toggle')) return 'toggle';
  if (lower.includes('输入') || lower.includes('type')) return 'input';
  if (lower.includes('关闭') || lower.includes('close')) return 'close';
  if (lower.includes('确认') || lower.includes('confirm')) return 'confirm';
  return 'click';
}

export function classifyElementType(thought: string): ElementType {
  return guessElementType(thought);
}

export function classifyElementAction(
  thought: string,
  pageChanged: boolean,
): ElementAction {
  return guessActionType(thought, pageChanged);
}

/**
 * Extract element name from VLM thought (supports 【name】 and "name" patterns)
 */
export function extractElementName(thought: string): string {
  if (!thought) return 'unknown';

  const explicitLabel = extractLearnedLabel(thought)?.primary;
  if (explicitLabel) {
    return explicitLabel;
  }

  const keywords = ['按钮', '卡片', '头像', '菜单', '返回', '图标', '标签', '列表', '输入框', '图片', '弹窗', '横幅', '选项', '聊天'];
  for (const kw of keywords) {
    const kwIdx = thought.indexOf(kw);
    if (kwIdx >= 0) {
      const before = thought.substring(0, kwIdx);
      let lastStop = -1;
      for (let j = before.length - 1; j >= 0; j--) {
        if (' ,，。！？（）"\''.indexOf(before[j]) >= 0) {
          lastStop = j;
          break;
        }
      }
      const prefix = lastStop >= 0 ? before.substring(lastStop + 1).trim() : before.trim();
      if (prefix.length > 0 && prefix.length <= 8) return prefix + kw;
      return kw;
    }
  }

  const clickIdx = thought.indexOf('点击');
  if (clickIdx >= 0) {
    const afterClick = thought.substring(clickIdx + 2).trim();
    const stopChars = ' ,，。！？；;\n（）';
    let cutIdx = afterClick.length;
    for (let i = 0; i < afterClick.length && i < 12; i++) {
      if (stopChars.indexOf(afterClick[i]) >= 0) {
        cutIdx = i;
        break;
      }
    }
    const name = afterClick.substring(0, cutIdx).trim();
    if (name.length > 1 && name.length <= 12) return name;
  }

  return 'element';
}

export function extractLearnedLabel(thought: string): LearnedLabel | undefined {
  if (!thought) return undefined;

  const bracketMatch = thought.match(/【([^】]+)】/);
  if (bracketMatch?.[1]) {
    const primary = bracketMatch[1].trim();
    if (primary) {
      return { primary, aliases: [] };
    }
  }

  const quoteMatch = thought.match(/"([^"]+)"/);
  if (quoteMatch?.[1]) {
    const primary = quoteMatch[1].trim();
    if (primary) {
      return { primary, aliases: [] };
    }
  }

  return undefined;
}

/**
 * Generate unique element ID
 */
export function generateElementId(
  pageName: string,
  elementName: string,
  idx: number,
  elemType: string,
  sameNameCount: number,
): string {
  const safeName = elementName.replace(/[^\w\u4e00-\u9fff]/g, '_');
  const finalName = safeName.length < 2 || safeName === 'element' ? `elem_${idx}` : safeName;
  const typeSuffix = elemType && elemType !== 'unknown' ? `_${elemType}` : '';
  const countSuffix = sameNameCount > 0 ? `_${sameNameCount + 1}` : '';
  return `${pageName}_${finalName}${typeSuffix}${countSuffix}`;
}

export function generatePageId(idx: number): string {
  return `page_${idx}`;
}

export function generateSecondaryPageId(parentPageId: string, idx: number): string {
  return `${parentPageId}__child_${idx}`;
}

export function generateRegionId(pageId: string, regionName: string): string {
  const safeRegionName = regionName
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '') || 'region';
  return `region_${pageId}_${safeRegionName}`;
}

export function generateElementStableId(pageId: string, idx: number): string {
  return `element_${pageId}_${idx}`;
}

export function generateLocatorId(elementId: string, type: string, idx: number): string {
  return `locator_${elementId}_${type}_${idx}`;
}

/**
 * Generate tab name from VLM thought
 */
export function generateTabName(thought: string, idx: number): string {
  const explicitLabel = extractLearnedLabel(thought)?.primary;
  if (explicitLabel && explicitLabel.length <= 20) {
    return explicitLabel;
  }

  const genericPatterns = [
    /(?:click|open|select|tap|navigate to)\s+(.+?)\s+tab\b/i,
    /tab\s+(.+?)\b/i,
  ];
  for (const pattern of genericPatterns) {
    const match = thought.match(pattern);
    const candidate = match?.[1]?.trim();
    if (candidate && candidate.length > 0 && candidate.length <= 20) {
      return candidate.replace(/[.,!?;:]+$/g, '').trim();
    }
  }

  return `Tab_${idx}`;
}

function normalizeLearnedName(name: string): string {
  return name
    .trim()
    .replace(/[^\p{L}\p{N}_-]+/gu, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function makeUniqueName(baseName: string, existingNames: string[] = []): string {
  if (!existingNames.includes(baseName)) {
    return baseName;
  }

  let suffix = 2;
  let candidate = `${baseName}_${suffix}`;
  while (existingNames.includes(candidate)) {
    suffix++;
    candidate = `${baseName}_${suffix}`;
  }
  return candidate;
}

/**
 * Derive a readable app name from an app package identifier.
 */
export function deriveAppName(pkg: string): string {
  const parts = pkg.split(/[./:]/).filter(Boolean);
  return parts.at(-1) || 'Unknown';
}

/**
 * Generate a stable page name from a learned tab label.
 */
export function generatePageName(
  tabName: string,
  idx: number,
  existingNames: string[] = [],
): string {
  const normalized = normalizeLearnedName(tabName);
  const baseName = normalized && !/^tab_\d+$/i.test(normalized)
    ? normalized
    : `Page_${idx}`;
  return makeUniqueName(baseName, existingNames);
}

/**
 * Generate a stable child page name derived from its source page.
 */
export function generateSecondaryPageName(
  sourcePageName: string,
  jumpIdx: number,
  existingNames: string[] = [],
): string {
  const baseName = `${normalizeLearnedName(sourcePageName) || 'Page'}__child_${jumpIdx}`;
  return makeUniqueName(baseName, existingNames);
}

/**
 * Generate a stable landing page name when no navigation tabs are discovered.
 */
export function generateLandingPageName(existingNames: string[] = []): string {
  return makeUniqueName('LandingPage', existingNames);
}

export function toNormalizedBox(
  bbox: number[],
  screenWidth: number,
  screenHeight: number,
): NormalizedBox | undefined {
  if (bbox.length < 4 || screenWidth <= 0 || screenHeight <= 0) {
    return undefined;
  }

  const [x1, y1, x2, y2] = bbox;
  return {
    left: x1 / screenWidth,
    top: y1 / screenHeight,
    width: (x2 - x1) / screenWidth,
    height: (y2 - y1) / screenHeight,
  };
}

export function toNormalizedPointBox(
  coords: number[],
  screenWidth: number,
  screenHeight: number,
  radius = 24,
): NormalizedBox | undefined {
  if (coords.length < 2 || screenWidth <= 0 || screenHeight <= 0) {
    return undefined;
  }

  const [x, y] = coords;
  const x1 = Math.max(0, x - radius);
  const y1 = Math.max(0, y - radius);
  const x2 = Math.min(screenWidth, x + radius);
  const y2 = Math.min(screenHeight, y + radius);
  return toNormalizedBox([x1, y1, x2, y2], screenWidth, screenHeight);
}

export function deriveElementRole(
  type: ElementType,
  action: ElementAction,
): ElementRole {
  if (action === 'navigate') return 'navigation';
  if (type === 'input' || action === 'input') return 'input';
  if (action === 'close') return 'dismiss';
  if (action === 'confirm') return 'confirm';
  if (type === 'card' || type === 'list-item') return 'content';
  if (action === 'click' || action === 'toggle' || action === 'filter') return 'action';
  return 'unknown';
}

export function buildLocatorStrategies(input: {
  elementId: string;
  label?: LearnedLabel;
  textCandidates?: string[];
  normalizedBox?: NormalizedBox;
}): LocatorStrategy[] {
  const strategies: LocatorStrategy[] = [];
  let idx = 1;
  const seenText = new Set<string>();

  const textLikeCandidates = [
    input.label?.primary,
    ...(input.label?.aliases || []),
    ...(input.textCandidates || []),
  ]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  for (const value of textLikeCandidates) {
    if (seenText.has(value)) continue;
    seenText.add(value);
    strategies.push({
      id: generateLocatorId(input.elementId, 'text', idx++),
      type: 'text',
      value,
      confidence: 0.9,
      enabled: true,
    });
  }

  if (input.normalizedBox) {
    strategies.push({
      id: generateLocatorId(input.elementId, 'normalized_box', idx++),
      type: 'normalized-box',
      value: input.normalizedBox,
      confidence: 0.65,
      enabled: true,
    });
  }

  return strategies;
}

/**
 * Check if two coordinates represent the same element (within threshold)
 */
export function isSameElement(
  coords1: number[],
  coords2: number[],
  threshold = 50,
): boolean {
  if (!coords1 || !coords2 || coords1.length < 2 || coords2.length < 2) return false;
  const dx = Math.abs(coords1[0] - coords2[0]);
  const dy = Math.abs(coords1[1] - coords2[1]);
  return dx < threshold && dy < threshold;
}

/**
 * Deduplicate tabs by coordinate proximity
 */
export function deduplicateTabs<T extends { coords: number[]; name: string }>(
  tabs: T[],
  threshold = 80,
): T[] {
  const unique: T[] = [];
  for (const tab of tabs) {
    const isDuplicate = unique.some(
      (u) => isSameElement(tab.coords, u.coords, threshold),
    );
    if (!isDuplicate) {
      unique.push(tab);
    }
  }
  return unique;
}

/**
 * Deduplicate elements by coordinate proximity
 */
export function deduplicateElements<T extends { coords: number[] }>(
  elements: T[],
  threshold = DEDUP_THRESHOLD.ELEMENT,
): T[] {
  const unique: T[] = [];
  const seenCoords: number[][] = [];
  for (const elem of elements) {
    const isDuplicate = seenCoords.some(
      (c) => isSameElement(elem.coords, c, threshold),
    );
    if (!isDuplicate) {
      unique.push(elem);
      seenCoords.push(elem.coords);
    }
  }
  return unique;
}

/**
 * Describe a vertical screen position using screen-relative buckets.
 */
export function describeVerticalPosition(yPos: number, screenHeight: number): string {
  if (yPos < 0 || screenHeight <= 0) {
    return 'unknown area';
  }

  if (yPos < screenHeight / 3) {
    return 'top area';
  }

  if (yPos < (screenHeight * 2) / 3) {
    return 'middle area';
  }

  return 'bottom area';
}

/**
 * Sanitize package name for use as filename
 */
export function mapFile(pkg: string): string {
  return pkg.replace(/[^a-zA-Z0-9._-]/g, '_') + '.json';
}

/**
 * Safe directory creation
 */
export function mkdirSafe(dir: string): void {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {
    // ignore
  }
}

/**
 * Save base64 screenshot to file
 */
export function saveScreenshot(b64: string, name: string, dir: string): string {
  const p = path.join(dir, `${name}.png`);
  fs.writeFileSync(p, Buffer.from(b64, 'base64'));
  return p;
}
