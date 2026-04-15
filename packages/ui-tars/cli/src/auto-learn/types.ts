/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AppMapMeta {
  appName: string;
  package: string;
  screenWidth: number;
  screenHeight: number;
  learnTime: number;
  learnDate: string;
  device: string;
}

export interface TabElement {
  index: number;
  name: string;
  coords: number[];
  bbox: number[];
  icon?: string;
  status: 'reliable' | 'unreliable';
}

export interface TopButtonElement {
  name: string;
  coords: number[];
  bbox: number[];
  position?: string;
  status: 'reliable' | 'unreliable';
}

export interface NavigationMap {
  tabs: TabElement[];
  topButtons: TopButtonElement[];
}

export interface ElementPattern {
  type: 'list' | 'grid' | 'carousel';
  itemWidth?: number;
  itemHeight: number;
  marginX?: number;
  marginY?: number;
  cols?: number;
  estimatedCount: number;
}

export interface Element {
  id: string;
  coords: number[];
  bbox: number[];
  type: 'button' | 'card' | 'list-item' | 'icon' | 'input' | 'unknown';
  name?: string;
  description?: string;
  text?: string;
  action: 'navigate' | 'filter' | 'toggle' | 'input' | 'unknown';
  target?: string;
  status: 'reliable' | 'unreliable';
  retryCount: number;
  lastError?: string;
  screenshotBefore?: string;
  screenshotAfter?: string;
}

export interface Region {
  id: string;
  position: 'left' | 'right' | 'top' | 'bottom' | 'center' | 'full';
  bbox: number[];
  type:
    | 'scrollable-list'
    | 'scrollable-grid'
    | 'static'
    | 'carousel'
    | 'dynamic';
  scrollable: boolean;
  elements: Element[];
  pattern?: ElementPattern;
  description?: string;
}

export interface ScrollInfo {
  regionId: string;
  direction: 'up' | 'down' | 'left' | 'right';
  totalCount?: number;
  hasMore: boolean;
}

export interface BackAction {
  type: 'click' | 'hotkey' | 'tab';
  coords?: number[];
  bbox?: number[];
  key?: string;
  targetTab?: number;
}

export type LayoutType =
  | 'scrollable-feed'
  | 'split-view'
  | 'card-grid'
  | 'list'
  | 'form'
  | 'unknown';

export interface PageMap {
  name: string;
  depth: number;
  parent?: string;
  entryElement?: string;
  layout: LayoutType;
  regions: Region[];
  scrollInfo?: ScrollInfo[];
  backAction?: BackAction;
  unreliableElements?: string[];
}

export interface NavigationGraph {
  [source: string]: string[];
}

export interface AppMap {
  meta: AppMapMeta;
  navigation: NavigationMap;
  pages: Record<string, PageMap>;
  secondaryPages?: Record<string, PageMap>;
  navigationGraph: NavigationGraph;
}

export interface ActionRecord {
  type: string;
  inputs: {
    start_coords?: number[];
    start_box?: string;
    end_coords?: number[];
    end_box?: string;
    content?: string;
    key?: string;
    direction?: string;
  };
  thought: string;
  screenshotBefore?: string;
  screenshotAfter?: string;
  time: number;
  loopIndex: number;
}

export interface LearningResult {
  actions: ActionRecord[];
  screenshots: string[];
  finalScreenshot?: string;
}

export interface PageSignature {
  name: string;
  features: string[];
  notFeatures?: string[];
  layout?: LayoutType;
  parentTypes?: string[];
}

export interface JumpTarget {
  elementId: string;
  coords: number[];
  screenshotBefore?: string;
}
