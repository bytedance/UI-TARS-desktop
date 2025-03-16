/**
 * The following code is modified based on
 * https://github.com/nanobrowser/nanobrowser/blob/master/chrome-extension/src/background/dom/service.ts
 *
 * Apache-2.0 License
 * Copyright (c) 2024 alexchenzl
 * https://github.com/nanobrowser/nanobrowser/blob/master/LICENSE
 */
import { createLogger } from '../utils';
import type { BuildDomTreeArgs, RawDomTreeNode } from './raw_types';
import {
  type DOMState,
  type DOMBaseNode,
  DOMElementNode,
  DOMTextNode,
} from './views';
import { Page } from 'puppeteer-core';

const logger = createLogger('DOMService');

export interface ReadabilityResult {
  title: string;
  content: string;
  textContent: string;
  length: number;
  excerpt: string;
  byline: string;
  dir: string;
  siteName: string;
  lang: string;
  publishedTime: string;
}

declare global {
  interface Window {
    buildDomTree: (args: BuildDomTreeArgs) => RawDomTreeNode | null;
    turn2Markdown: (selector?: string) => string;
    parserReadability: () => ReadabilityResult | null;
  }
}

/**
 * Get the scroll information for the current page.
 * @returns A tuple containing the number of pixels above and below the current scroll position.
 */
export async function getScrollInfo(page: Page): Promise<[number, number]> {
  const result = await page.evaluate(() => {
    const scroll_y = window.scrollY;
    const viewport_height = window.innerHeight;
    const total_height = document.documentElement.scrollHeight;
    return {
      pixels_above: scroll_y,
      pixels_below: total_height - (scroll_y + viewport_height),
    };
  });

  if (!result) {
    throw new Error('Failed to get scroll information');
  }
  return [result.pixels_above, result.pixels_below];
}

/**
 * Get the markdown content for the current page.
 * @param tabId - The ID of the tab to get the markdown content for.
 * @param selector - The selector to get the markdown content for. If not provided, the body of the entire page will be converted to markdown.
 * @returns The markdown content for the selected element on the current page.
 */
export async function getMarkdownContent(
  page: Page,
  selector?: string,
): Promise<string> {
  const result = await page.evaluate((sel) => {
    return window.turn2Markdown(sel);
  }, selector || '');

  if (!result) {
    throw new Error('Failed to get markdown content');
  }
  return result as string;
}

/**
 * Get the readability content for the current page.
 * @param tabId - The ID of the tab to get the readability content for.
 * @returns The readability content for the current page.
 */
export async function getReadabilityContent(
  page: Page,
): Promise<ReadabilityResult> {
  const result = await page.evaluate(() => {
    return window.parserReadability();
  });
  if (!result) {
    throw new Error('Failed to get readability content');
  }
  return result as ReadabilityResult;
}

/**
/**
 * Get the clickable elements for the current page.
 * @param tabId - The ID of the tab to get the clickable elements for.
 * @param highlightElements - Whether to highlight the clickable elements.
 * @param focusElement - The element to focus on.
 * @param viewportExpansion - The viewport expansion to use.
 * @returns A DOMState object containing the clickable elements for the current page.
 */
export async function getClickableElements(
  page: Page,
  highlightElements = true,
  focusElement = -1,
  viewportExpansion = 0,
): Promise<DOMState | null> {
  try {
    const elementTree = await _buildDomTree(
      page,
      highlightElements,
      focusElement,
      viewportExpansion,
    );
    const selectorMap = createSelectorMap(elementTree);
    return { elementTree, selectorMap };
  } catch (error) {
    logger.error('Failed to build DOM tree:', error);
    return null;
  }
}

export function createSelectorMap(
  elementTree: DOMElementNode,
): Map<number, DOMElementNode> {
  const selectorMap = new Map<number, DOMElementNode>();

  function processNode(node: DOMBaseNode): void {
    if (node instanceof DOMElementNode) {
      if (node.highlightIndex != null) {
        // console.log('createSelectorMap node.highlightIndex:', node.highlightIndex);
        selectorMap.set(node.highlightIndex, node);
      }
      node.children.forEach(processNode);
    }
  }

  processNode(elementTree);
  return selectorMap;
}

async function _buildDomTree(
  page: Page,
  highlightElements = true,
  focusElement = -1,
  viewportExpansion = 0,
): Promise<DOMElementNode> {
  const rawDomTree = await page.evaluate(
    (args) => {
      // Access buildDomTree from the window context of the target page
      return window.buildDomTree(args);
    },
    {
      doHighlightElements: highlightElements,
      focusHighlightIndex: focusElement,
      viewportExpansion,
    },
  );

  if (rawDomTree !== null) {
    const elementTree = parseNode(rawDomTree as RawDomTreeNode);
    if (elementTree !== null && elementTree instanceof DOMElementNode) {
      return elementTree;
    }
  }
  throw new Error('Failed to build DOM tree: Invalid or empty tree structure');
}

export function parseNode(
  nodeData: RawDomTreeNode,
  parent: DOMElementNode | null = null,
): DOMBaseNode | null {
  if (!nodeData) return null;

  if ('type' in nodeData) {
    // && nodeData.type === 'TEXT_NODE'
    return new DOMTextNode(nodeData.text, nodeData.isVisible, parent);
  }

  const tagName = nodeData.tagName;

  // Parse coordinates if they exist
  const viewportCoordinates = nodeData.viewportCoordinates;
  const pageCoordinates = nodeData.pageCoordinates;
  const viewportInfo = nodeData.viewportInfo;

  // Element node (possible other kinds of nodes, but we don't care about them for now)
  const elementNode = new DOMElementNode({
    tagName: tagName,
    xpath: nodeData.xpath,
    cssSelector: nodeData.cssSelector,
    attributes: nodeData.attributes ?? {},
    children: [],
    isVisible: nodeData.isVisible ?? false,
    isInteractive: nodeData.isInteractive ?? false,
    isTopElement: nodeData.isTopElement ?? false,
    highlightIndex: nodeData.highlightIndex,
    viewportCoordinates: viewportCoordinates ?? undefined,
    pageCoordinates: pageCoordinates ?? undefined,
    viewportInfo: viewportInfo ?? undefined,
    shadowRoot: nodeData.shadowRoot ?? false,
    parent,
  });

  const children: DOMBaseNode[] = [];
  for (const child of nodeData.children || []) {
    if (child !== null) {
      const childNode = parseNode(child, elementNode);
      if (childNode !== null) {
        children.push(childNode);
      }
    }
  }

  elementNode.children = children;
  return elementNode;
}

export async function removeHighlights(page: Page): Promise<void> {
  try {
    await page.evaluate(() => {
      // Remove the highlight container and all its contents
      const container = document.getElementById(
        'playwright-highlight-container',
      );
      if (container) {
        container.remove();
      }

      // Remove highlight attributes from elements
      const highlightedElements = document.querySelectorAll(
        '[browser-user-highlight-id^="playwright-highlight-"]',
      );
      for (const el of Array.from(highlightedElements)) {
        el.removeAttribute('browser-user-highlight-id');
      }
    });
  } catch (error) {
    logger.error('Failed to remove highlights:', error);
  }
}
