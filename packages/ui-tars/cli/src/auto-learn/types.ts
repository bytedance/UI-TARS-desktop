/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
// Core UI-map types.
// Public consumers should primarily work with UIMap + RuntimeMapView.

export const UI_MAP_SCHEMA_VERSION = 2;

export type NodeStatus = 'reliable' | 'unreliable';
export type ElementType =
  | 'button'
  | 'card'
  | 'list-item'
  | 'icon'
  | 'input'
  | 'unknown';
export type ElementAction =
  | 'click'
  | 'navigate'
  | 'filter'
  | 'toggle'
  | 'input'
  | 'close'
  | 'confirm'
  | 'unknown';
export type ElementRole =
  | 'navigation'
  | 'action'
  | 'input'
  | 'content'
  | 'dismiss'
  | 'confirm'
  | 'unknown';
export type LocatorStrategyType =
  | 'text'
  | 'ocr'
  | 'a11y'
  | 'relative'
  | 'region-relative'
  | 'normalized-box';
export type RuntimeMapMode = 'summary' | 'focused' | 'expanded';
export type CompletionPolicy =
  | 'stop_on_page_arrival'
  | 'stop_on_target_open'
  | 'stop_after_content_action';

export interface LearnedLabel {
  primary?: string;
  aliases?: string[];
  locale?: string;
}

export interface NormalizedBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface LocatorStrategy {
  id: string;
  type: LocatorStrategyType;
  value: string | NormalizedBox | Record<string, unknown>;
  confidence: number;
  enabled: boolean;
}

// Compatibility types retained for the current learning implementation.
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
  status: NodeStatus;
}

export interface TopButtonElement {
  name: string;
  coords: number[];
  bbox: number[];
  position?: string;
  status: NodeStatus;
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
  type: ElementType;
  name?: string;
  description?: string;
  text?: string;
  action: ElementAction;
  target?: string;
  status: NodeStatus;
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

// Primary persisted UI learning asset.
export interface UIMapMeta {
  schemaVersion: number;
  appId: string;
  appName?: string;
  platform: 'android';
  screenWidth: number;
  screenHeight: number;
  learnTime: number;
  learnDate: string;
  device: string;
}

export interface UIPage {
  id: string;
  label?: LearnedLabel;
  depth: number;
  layout: LayoutType;
  status: NodeStatus;
  confidence: number;
  regionIds: string[];
  parentPageId?: string;
  entryElementId?: string;
  signatureTexts?: string[];
  anchorElementIds?: string[];
  backAction?: BackAction;
}

export interface UIRegion {
  id: string;
  pageId: string;
  position: 'left' | 'right' | 'top' | 'bottom' | 'center' | 'full';
  bbox: number[];
  normalizedBox?: NormalizedBox;
  type:
    | 'scrollable-list'
    | 'scrollable-grid'
    | 'static'
    | 'carousel'
    | 'dynamic';
  scrollable: boolean;
  elementIds: string[];
  description?: string;
}

export interface UIElement {
  id: string;
  pageId: string;
  regionId?: string;
  label?: LearnedLabel;
  textCandidates?: string[];
  coords: number[];
  bbox: number[];
  normalizedBox?: NormalizedBox;
  type: ElementType;
  role: ElementRole;
  action: ElementAction;
  targetPageId?: string;
  locatorStrategies: LocatorStrategy[];
  status: NodeStatus;
  confidence: number;
  retryCount: number;
  lastError?: string;
  screenshotBefore?: string;
  screenshotAfter?: string;
  description?: string;
}

export interface NavigationEdge {
  fromPageId: string;
  toPageId: string;
  viaElementId: string;
  confidence: number;
}

export interface UIMap {
  meta: UIMapMeta;
  pages: Record<string, UIPage>;
  regions: Record<string, UIRegion>;
  elements: Record<string, UIElement>;
  navigation: NavigationEdge[];
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

// Lightweight runtime execution slice derived from UIMap.
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

export interface RuntimeBudget {
  mode: RuntimeMapMode;
  maxPageCandidates: number;
  maxElementsPerPage: number;
  maxTotalElements: number;
  maxLocatorsPerElement: number;
  maxSignatureTextsPerPage: number;
  includeNavigationElements: boolean;
  includePrimaryActionElements: boolean;
  includeInputElements: boolean;
  includeAnchorElements: boolean;
  includeContentTemplates: boolean;
  includeNeighborRelations: boolean;
  includePageTransitions: boolean;
  minPageConfidence: number;
  minElementConfidence: number;
  minLocatorConfidence: number;
}

export interface RuntimeTaskHint {
  query?: string;
  currentPageId?: string;
  targetPageId?: string;
  targetElementText?: string;
  preferredRoles?: ElementRole[];
}

export interface RuntimePageRef {
  id: string;
  label?: string;
  aliases?: string[];
  confidence: number;
  score: number;
}

export interface RuntimeResolvedElementCandidate {
  elementId: string;
  pageId: string;
  role: ElementRole;
  action: ElementAction;
  label?: string;
  aliases?: string[];
  confidence: number;
  score: number;
}

export type RuntimeIntent =
  | {
      kind: 'navigate';
      rawQuery: string;
      targetPage: RuntimePageRef;
      completionPolicy: 'stop_on_page_arrival';
    }
  | {
      kind: 'act';
      rawQuery: string;
      actionQuery: string;
      targetPage?: RuntimePageRef;
      targetElements: RuntimeResolvedElementCandidate[];
      completionPolicy: Exclude<CompletionPolicy, 'stop_on_page_arrival'>;
    }
  | {
      kind: 'navigate_then_act';
      rawQuery: string;
      navigationQuery: string;
      remainingQuery: string;
      targetPage: RuntimePageRef;
      targetElements: RuntimeResolvedElementCandidate[];
      completionPolicy: Exclude<CompletionPolicy, 'stop_on_page_arrival'>;
    };

export interface RuntimeLocator {
  id: string;
  type: LocatorStrategyType;
  value: string | Record<string, unknown>;
  confidence: number;
}

export interface RuntimeElementRelationHint {
  anchorElementId: string;
  relation: 'left-of' | 'right-of' | 'above' | 'below' | 'inside' | 'near';
}

export interface RuntimeElementRef {
  id: string;
  pageId: string;
  regionId?: string;
  role: ElementRole;
  action: ElementAction;
  label?: string;
  aliases?: string[];
  confidence: number;
  score: number;
  targetPageId?: string;
  locators: RuntimeLocator[];
  relationHints?: RuntimeElementRelationHint[];
}

export interface RuntimePageView {
  page: RuntimePageRef;
  signatureTexts: string[];
  navigationElementIds: string[];
  primaryActionElementIds: string[];
  inputElementIds: string[];
  anchorElementIds: string[];
}

export interface RuntimeMapTransition {
  fromPageId: string;
  toPageId: string;
  viaElementId: string;
  confidence: number;
}

export interface RuntimeMapView {
  mode: RuntimeMapMode;
  budget: RuntimeBudget;
  taskHint?: RuntimeTaskHint;
  currentPageCandidates: RuntimePageRef[];
  targetPageCandidates: RuntimePageRef[];
  pages: Record<string, RuntimePageView>;
  elements: Record<string, RuntimeElementRef>;
  transitions?: RuntimeMapTransition[];
  truncated: boolean;
  expansionHints?: string[];
}

export interface ExpandRequest {
  addPages?: number;
  addElementsPerPage?: number;
  addLocatorsPerElement?: number;
  includeNeighborRelations?: boolean;
  includeContentTemplates?: boolean;
  includeTransitions?: boolean;
  focusPageId?: string;
  focusElementId?: string;
}
