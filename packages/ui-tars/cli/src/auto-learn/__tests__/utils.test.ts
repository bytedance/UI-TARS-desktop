/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import {
  extractCoords,
  parseBbox,
  guessElementType,
  guessActionType,
  extractElementName,
  generateElementId,
  generateTabName,
  deriveAppName,
  generatePageName,
  generateLandingPageName,
  generateSecondaryPageName,
  isSameElement,
  deduplicateTabs,
  deduplicateElements,
  describeVerticalPosition,
  mapFile,
  saveScreenshot,
  DEDUP_THRESHOLD,
} from '../utils';

describe('extractCoords', () => {
  it('should extract start_coords from action inputs', () => {
    const inputs = { start_coords: [100, 200] };
    expect(extractCoords(inputs)).toEqual([100, 200]);
  });

  it('should return empty array when start_coords is missing', () => {
    expect(extractCoords({})).toEqual([]);
  });

  it('should return empty array when start_coords has less than 2 elements', () => {
    expect(extractCoords({ start_coords: [100] })).toEqual([]);
  });

  it('should return empty array when start_coords is not an array', () => {
    expect(extractCoords({ start_coords: 'invalid' })).toEqual([]);
  });
});

describe('parseBbox', () => {
  it('should parse bbox string to number array', () => {
    expect(parseBbox('[10, 20, 30, 40]')).toEqual([10, 20, 30, 40]);
  });

  it('should return empty array for invalid input', () => {
    expect(parseBbox('')).toEqual([]);
    expect(parseBbox('invalid')).toEqual([]);
  });
});

describe('guessElementType', () => {
  it('should recognize button type', () => {
    expect(guessElementType('I will click the button')).toBe('button');
    expect(guessElementType('click the button')).toBe('button');
  });

  it('should recognize card type', () => {
    expect(guessElementType('click the featured card')).toBe('card');
    expect(guessElementType('click card')).toBe('card');
  });

  it('should recognize list-item type', () => {
    expect(guessElementType('click list item')).toBe('list-item');
    expect(guessElementType('click list item')).toBe('list-item');
  });

  it('should recognize input type', () => {
    expect(guessElementType('search input')).toBe('input');
    expect(guessElementType('type input')).toBe('input');
  });

  it('should recognize icon type', () => {
    expect(guessElementType('click icon')).toBe('icon');
    expect(guessElementType('click icon')).toBe('icon');
  });

  it('should recognize tab/button for navigation', () => {
    expect(guessElementType('click tab navigation')).toBe('button');
    expect(guessElementType('select profile tab')).toBe('button');
  });

  it('should return unknown for unrecognized types', () => {
    expect(guessElementType('some random text')).toBe('unknown');
  });

  it('should retain multilingual element type support', () => {
    expect(guessElementType('点击按钮')).toBe('button');
    expect(guessElementType('输入框')).toBe('input');
  });
});

describe('guessActionType', () => {
  it('should return navigate when page changed', () => {
    expect(guessActionType('click something', true)).toBe('navigate');
  });

  it('should recognize filter action', () => {
    expect(guessActionType('filter content', false)).toBe('filter');
    expect(guessActionType('apply filter', false)).toBe('filter');
  });

  it('should recognize toggle action', () => {
    expect(guessActionType('toggle state', false)).toBe('toggle');
    expect(guessActionType('toggle option', false)).toBe('toggle');
  });

  it('should recognize input action', () => {
    expect(guessActionType('type text', false)).toBe('input');
    expect(guessActionType('type text', false)).toBe('input');
  });

  it('should return click for unknown actions', () => {
    expect(guessActionType('click here', false)).toBe('click');
  });

  it('should retain multilingual action support', () => {
    expect(guessActionType('筛选内容', false)).toBe('filter');
    expect(guessActionType('切换状态', false)).toBe('toggle');
  });
});

describe('extractElementName', () => {
  it('should extract name from 【name】 pattern', () => {
    expect(extractElementName('I will click 【Discover】')).toBe('Discover');
    expect(extractElementName('Thought: click 【featured card】')).toBe('featured card');
  });

  it('should extract name from "name" pattern', () => {
    expect(extractElementName('click "button"')).toBe('button');
  });

  it('should return "unknown" for empty thought', () => {
    expect(extractElementName('')).toBe('unknown');
  });

  it('should extract name from keyword-based pattern', () => {
    expect(extractElementName('click featured card to view details')).toBe('element');
    expect(extractElementName('tap the primary button to confirm')).toBe('element');
  });

  it('should return "element" when no pattern matches', () => {
    expect(extractElementName('some random action')).toBe('element');
  });

  it('should support localized labels inside 【name】 patterns', () => {
    expect(extractElementName('我会点击【发现】')).toBe('发现');
  });

  it('should accept names from 【name】 pattern within length limit (<=20)', () => {
    const longName = 'long-valid-label';
    expect(extractElementName(`【${longName}】`)).toBe(longName);
  });
});

describe('generateElementId', () => {
  it('should generate element ID with page name and element name', () => {
    const id = generateElementId('Page_0', 'featured_card', 1, 'card', 0);
    expect(id).toContain('Page_0');
    expect(id).toContain('featured_card');
    expect(id).toContain('_card');
  });

  it('should handle unknown element type', () => {
    const id = generateElementId('Page_0', 'item', 1, 'unknown', 0);
    expect(id).not.toContain('_unknown');
  });

  it('should add count suffix for duplicate names', () => {
    const id = generateElementId('Page_0', 'button', 1, 'button', 2);
    expect(id).toContain('_3');
  });

  it('should sanitize special characters in element name', () => {
    const id = generateElementId('Page_0', 'special@chars#', 1, 'unknown', 0);
    expect(id).not.toContain('@');
    expect(id).not.toContain('#');
  });
});

describe('generateTabName', () => {
  it('should extract tab name from 【name】 pattern', () => {
    expect(generateTabName('点击【Discover】tab', 1)).toBe('Discover');
    expect(generateTabName('select 【Profile】 tab', 2)).toBe('Profile');
  });

  it('should derive generic tab names from tab wording', () => {
    expect(generateTabName('navigate to profile tab', 1)).toBe('profile');
    expect(generateTabName('click settings tab', 2)).toBe('settings');
  });

  it('should fallback to Tab_N when no pattern matches', () => {
    expect(generateTabName('switch to the next navigation target', 3)).toBe('Tab_3');
  });
});

describe('deriveAppName', () => {
  it('should derive a readable app name from the package id', () => {
    expect(deriveAppName('com.example.reader')).toBe('reader');
    expect(deriveAppName('org.sample.my_app')).toBe('my_app');
  });

  it('should fall back to Unknown for empty package ids', () => {
    expect(deriveAppName('')).toBe('Unknown');
  });
});

describe('generatePageName', () => {
  it('should preserve learned tab labels for root page names', () => {
    expect(generatePageName('Discover', 1)).toBe('Discover');
    expect(generatePageName('Profile', 2)).toBe('Profile');
  });

  it('should fall back to Page_N for generated tab labels', () => {
    expect(generatePageName('Tab_3', 3)).toBe('Page_3');
    expect(generatePageName('', 4)).toBe('Page_4');
  });

  it('should make duplicate page names unique', () => {
    expect(generatePageName('Discover', 2, ['Discover'])).toBe('Discover_2');
  });

  it('should sanitize unsafe characters in learned page names', () => {
    expect(generatePageName('Profile / Settings', 2)).toBe('Profile_Settings');
    expect(generatePageName('  Search:Results  ', 3)).toBe('Search_Results');
  });
});

describe('generateSecondaryPageName', () => {
  it('should generate source-aware child page names', () => {
    expect(generateSecondaryPageName('Discover', 1)).toBe('Discover__child_1');
  });

  it('should avoid collisions with existing names', () => {
    expect(
      generateSecondaryPageName('Discover', 1, ['Discover__child_1']),
    ).toBe('Discover__child_1_2');
  });

  it('should sanitize unsafe source page names', () => {
    expect(generateSecondaryPageName('Profile / Settings', 1)).toBe(
      'Profile_Settings__child_1',
    );
  });
});

describe('generateLandingPageName', () => {
  it('should use a stable landing page name', () => {
    expect(generateLandingPageName()).toBe('LandingPage');
  });

  it('should avoid collisions with existing page names', () => {
    expect(generateLandingPageName(['LandingPage'])).toBe('LandingPage_2');
  });
});

describe('isSameElement', () => {
  it('should return true for coordinates within threshold', () => {
    expect(isSameElement([100, 200], [110, 210], 50)).toBe(true);
  });

  it('should return false for coordinates outside threshold', () => {
    expect(isSameElement([100, 200], [200, 300], 50)).toBe(false);
  });

  it('should return false for invalid coordinates', () => {
    expect(isSameElement([], [100, 200])).toBe(false);
    expect(isSameElement([100], [100, 200])).toBe(false);
    expect(isSameElement(null as any, [100, 200])).toBe(false);
  });

  it('should use custom threshold', () => {
    // dx=30, dy=30, threshold=50: 30 < 50 && 30 < 50 -> true
    expect(isSameElement([100, 200], [130, 230], 50)).toBe(true);
    // dx=60, dy=60, threshold=50: 60 >= 50 -> false
    expect(isSameElement([100, 200], [160, 260], 50)).toBe(false);
    // dx=60, dy=60, threshold=100: 60 < 100 -> true
    expect(isSameElement([100, 200], [160, 260], 100)).toBe(true);
  });
});

describe('deduplicateTabs', () => {
  it('should remove tabs with similar coordinates', () => {
    const tabs = [
      { coords: [100, 200], name: 'Tab1' },
      { coords: [105, 205], name: 'Tab2' },
      { coords: [300, 200], name: 'Tab3' },
    ];
    const result = deduplicateTabs(tabs, 20);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Tab1');
    expect(result[1].name).toBe('Tab3');
  });

  it('should keep all tabs when coordinates are distinct', () => {
    const tabs = [
      { coords: [100, 200], name: 'Tab1' },
      { coords: [300, 200], name: 'Tab2' },
      { coords: [500, 200], name: 'Tab3' },
    ];
    expect(deduplicateTabs(tabs, 50)).toHaveLength(3);
  });
});

describe('deduplicateElements', () => {
  it('should remove elements with similar coordinates', () => {
    const elements = [
      { coords: [100, 200] },
      { coords: [110, 210] },
      { coords: [300, 200] },
    ];
    expect(deduplicateElements(elements, 20)).toHaveLength(2);
  });
});

describe('mapFile', () => {
  it('should sanitize package name for filename', () => {
    expect(mapFile('com.example.app')).toBe('com.example.app.json');
    expect(mapFile('com.example/my-app')).toBe('com.example_my-app.json');
    expect(mapFile('com.app@v2.0')).toBe('com.app_v2.0.json');
  });
});

describe('DEDUP_THRESHOLD', () => {
  it('should have tab threshold of 80', () => {
    expect(DEDUP_THRESHOLD.TAB).toBe(80);
  });

  it('should have element threshold of 60', () => {
    expect(DEDUP_THRESHOLD.ELEMENT).toBe(60);
  });

  it('should use ELEMENT threshold as default in deduplicateElements', () => {
    // Default threshold should be 60 (DEDUP_THRESHOLD.ELEMENT)
    const elements = [
      { coords: [100, 200] },
      { coords: [155, 255] }, // dx=55, dy=55 -> same at 60, different at 50
    ];
    expect(deduplicateElements(elements)).toHaveLength(1);
    expect(deduplicateElements(elements, 50)).toHaveLength(2);
  });
});

describe('describeVerticalPosition', () => {
  it('should describe positions using screen height ratios', () => {
    expect(describeVerticalPosition(100, 900)).toBe('top area');
    expect(describeVerticalPosition(450, 900)).toBe('middle area');
    expect(describeVerticalPosition(800, 900)).toBe('bottom area');
  });

  it('should handle invalid inputs defensively', () => {
    expect(describeVerticalPosition(-1, 900)).toBe('unknown area');
    expect(describeVerticalPosition(100, 0)).toBe('unknown area');
  });
});
