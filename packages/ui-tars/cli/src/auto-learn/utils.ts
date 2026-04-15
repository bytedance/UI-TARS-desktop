/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import fs from 'node:fs';
import path from 'node:path';

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
  return match[1].split(',').map((s) => parseFloat(s.trim()));
}

/**
 * Guess element type from VLM thought string
 */
export function guessElementType(
  thought: string,
): 'button' | 'card' | 'list-item' | 'icon' | 'input' | 'unknown' {
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
export function guessActionType(thought: string, pageChanged: boolean): string {
  const lower = thought.toLowerCase();
  if (pageChanged) return 'navigate';
  if (lower.includes('筛选') || lower.includes('过滤') || lower.includes('filter')) return 'filter';
  if (lower.includes('切换') || lower.includes('toggle')) return 'toggle';
  if (lower.includes('输入') || lower.includes('type')) return 'input';
  if (lower.includes('关闭') || lower.includes('close')) return 'close';
  if (lower.includes('确认') || lower.includes('confirm')) return 'confirm';
  return 'click';
}

/**
 * Extract element name from VLM thought (supports 【name】 and "name" patterns)
 */
export function extractElementName(thought: string): string {
  if (!thought) return 'unknown';

  // Try 【name】 pattern
  const start = thought.indexOf('【');
  const end = thought.indexOf('】');
  if (start >= 0 && end > start) {
    const name = thought.substring(start + 1, end).trim();
    if (name.length > 1 && name.length <= 20) return name;
  }

  // Try "name" pattern
  const q1 = thought.indexOf('"');
  const q2 = thought.lastIndexOf('"');
  if (q1 >= 0 && q2 > q1) {
    const name = thought.substring(q1 + 1, q2).trim();
    if (name.length > 1 && name.length <= 20) return name;
  }

  // Keyword-based extraction
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

  // Try "点击XXX" pattern
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

/**
 * Generate tab name from VLM thought
 */
export function generateTabName(thought: string, idx: number): string {
  const bracketMatch = thought.match(/【([^】]+)】/);
  if (bracketMatch && bracketMatch[1]) {
    const name = bracketMatch[1].trim();
    if (name.length > 1 && name.length <= 10) return name;
  }

  const tabPatterns = ['首页', '剧场', 'AI伴侣', '消息', '我的', '设置', '个人'];
  for (const pattern of tabPatterns) {
    if (thought.includes(pattern)) return pattern;
  }

  return `Tab_${idx}`;
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
export function deduplicateTabs(
  tabs: Array<{ coords: number[]; name: string }>,
  threshold = 80,
): typeof tabs {
  const unique: typeof tabs = [];
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
export function deduplicateElements(
  elements: Array<{ coords: number[] }>,
  threshold = DEDUP_THRESHOLD.ELEMENT,
): typeof elements {
  const unique: typeof elements = [];
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
  const p = path.join(dir, name + '.png');
  fs.writeFileSync(p, Buffer.from(b64, 'base64'));
  return p;
}
