/**
 * The following code is modified based on
 * https://github.com/nanobrowser/nanobrowser/blob/master/chrome-extension/src/background/dom/raw_types.ts
 *
 * Apache-2.0 License
 * Copyright (c) 2024 alexchenzl
 * https://github.com/nanobrowser/nanobrowser/blob/master/LICENSE
 */
import type { CoordinateSet, ViewportInfo } from './history/views';
// define the raw types used in pure javascript files that are injected into the page

export type RawDomTextNode = {
  type: string;
  text: string;
  isVisible: boolean;
};

export type RawDomElementNode = {
  // Element node doesn't have a type field
  tagName: string | null;
  xpath: string | null;
  cssSelector: string | null;
  attributes: Record<string, string>;
  children: (RawDomTreeNode | null)[];
  isVisible?: boolean;
  isInteractive?: boolean;
  isTopElement?: boolean;
  highlightIndex?: number;
  viewportCoordinates?: CoordinateSet;
  pageCoordinates?: CoordinateSet;
  viewportInfo?: ViewportInfo;
  shadowRoot?: boolean;
};

export type RawDomTreeNode = RawDomTextNode | RawDomElementNode;

export interface BuildDomTreeArgs {
  doHighlightElements: boolean;
  focusHighlightIndex: number;
  viewportExpansion: number;
}
