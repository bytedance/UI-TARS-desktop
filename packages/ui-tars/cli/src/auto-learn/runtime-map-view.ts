/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
// RuntimeMapView is the budget-aware projection sent to smaller execution models.
import type {
  ExpandRequest,
  LocatorStrategy,
  RuntimeBudget,
  RuntimeElementRef,
  RuntimeLocator,
  RuntimeMapView,
  RuntimePageRef,
  RuntimePageView,
  RuntimeTaskHint,
  UIElement,
  UIMap,
  UIPage,
} from './types';

export const RUNTIME_BUDGETS: Record<'tiny' | 'small' | 'medium' | 'large', RuntimeBudget> = {
  tiny: {
    mode: 'summary',
    maxPageCandidates: 2,
    maxElementsPerPage: 6,
    maxTotalElements: 12,
    maxLocatorsPerElement: 2,
    maxSignatureTextsPerPage: 2,
    includeNavigationElements: true,
    includePrimaryActionElements: true,
    includeInputElements: true,
    includeAnchorElements: false,
    includeContentTemplates: false,
    includeNeighborRelations: false,
    includePageTransitions: false,
    minPageConfidence: 0.55,
    minElementConfidence: 0.6,
    minLocatorConfidence: 0.65,
  },
  small: {
    mode: 'focused',
    maxPageCandidates: 3,
    maxElementsPerPage: 12,
    maxTotalElements: 24,
    maxLocatorsPerElement: 3,
    maxSignatureTextsPerPage: 3,
    includeNavigationElements: true,
    includePrimaryActionElements: true,
    includeInputElements: true,
    includeAnchorElements: true,
    includeContentTemplates: false,
    includeNeighborRelations: false,
    includePageTransitions: true,
    minPageConfidence: 0.5,
    minElementConfidence: 0.55,
    minLocatorConfidence: 0.6,
  },
  medium: {
    mode: 'expanded',
    maxPageCandidates: 5,
    maxElementsPerPage: 20,
    maxTotalElements: 60,
    maxLocatorsPerElement: 4,
    maxSignatureTextsPerPage: 4,
    includeNavigationElements: true,
    includePrimaryActionElements: true,
    includeInputElements: true,
    includeAnchorElements: true,
    includeContentTemplates: true,
    includeNeighborRelations: true,
    includePageTransitions: true,
    minPageConfidence: 0.45,
    minElementConfidence: 0.5,
    minLocatorConfidence: 0.55,
  },
  large: {
    mode: 'expanded',
    maxPageCandidates: 8,
    maxElementsPerPage: 40,
    maxTotalElements: 160,
    maxLocatorsPerElement: 5,
    maxSignatureTextsPerPage: 6,
    includeNavigationElements: true,
    includePrimaryActionElements: true,
    includeInputElements: true,
    includeAnchorElements: true,
    includeContentTemplates: true,
    includeNeighborRelations: true,
    includePageTransitions: true,
    minPageConfidence: 0.35,
    minElementConfidence: 0.4,
    minLocatorConfidence: 0.45,
  },
};

function textMatches(query: string | undefined, values: Array<string | undefined>): number {
  const normalizedQuery = query?.toLowerCase().trim();
  if (!normalizedQuery) return 0;

  return values
    .filter((value): value is string => Boolean(value))
    .some((value) => normalizedQuery.includes(value.toLowerCase()) || value.toLowerCase().includes(normalizedQuery))
    ? 1
    : 0;
}

function scorePage(page: UIPage, map: UIMap, taskHint: RuntimeTaskHint | undefined, kind: 'current' | 'target'): number {
  let score = page.confidence * 0.2;
  if (kind === 'current' && taskHint?.currentPageId === page.id) score += 1.0;
  if (kind === 'target' && taskHint?.targetPageId === page.id) score += 1.0;
  score += textMatches(taskHint?.query, [
    page.label?.primary,
    ...(page.label?.aliases || []),
    ...(page.signatureTexts || []),
  ]) * 0.6;

  if (taskHint?.currentPageId && kind === 'target') {
    const reachable = map.navigation.some(
      (edge) => edge.fromPageId === taskHint.currentPageId && edge.toPageId === page.id,
    );
    if (reachable) score += 0.4;
  }

  return score;
}

function locatorPriority(locator: LocatorStrategy): number {
  switch (locator.type) {
    case 'a11y':
      return 5;
    case 'text':
      return 4;
    case 'relative':
      return 3;
    case 'region-relative':
      return 2;
    case 'normalized-box':
      return 1;
    default:
      return 0;
  }
}

function selectTopLocators(
  strategies: LocatorStrategy[],
  budget: RuntimeBudget,
): RuntimeLocator[] {
  return strategies
    .filter((strategy) => strategy.enabled && strategy.confidence >= budget.minLocatorConfidence)
    .sort((left, right) => {
      const priorityDelta = locatorPriority(right) - locatorPriority(left);
      if (priorityDelta !== 0) return priorityDelta;
      return right.confidence - left.confidence;
    })
    .slice(0, budget.maxLocatorsPerElement)
    .map((strategy) => ({
      id: strategy.id,
      type: strategy.type,
      value: strategy.value as string | Record<string, unknown>,
      confidence: strategy.confidence,
    }));
}

function scoreElement(element: UIElement, taskHint: RuntimeTaskHint | undefined): number {
  let score = element.confidence * 0.2;
  score += textMatches(taskHint?.targetElementText || taskHint?.query, [
    element.label?.primary,
    ...(element.label?.aliases || []),
    ...(element.textCandidates || []),
  ]) * 0.6;

  if (taskHint?.preferredRoles?.includes(element.role)) {
    score += 0.35;
  }

  if (element.action === 'navigate' && taskHint?.query?.toLowerCase().includes('go to')) {
    score += 0.2;
  }

  return score;
}

function buildPageRef(page: UIPage, score: number): RuntimePageRef {
  return {
    id: page.id,
    label: page.label?.primary,
    aliases: page.label?.aliases || [],
    confidence: page.confidence,
    score,
  };
}

function buildRuntimeElement(
  element: UIElement,
  budget: RuntimeBudget,
  score: number,
): RuntimeElementRef {
  return {
    id: element.id,
    pageId: element.pageId,
    regionId: element.regionId,
    role: element.role,
    action: element.action,
    label: element.label?.primary,
    aliases: element.label?.aliases || [],
    confidence: element.confidence,
    score,
    targetPageId: element.targetPageId,
    locators: selectTopLocators(element.locatorStrategies, budget),
  };
}

function appendUnique(values: string[], value: string): void {
  if (!values.includes(value)) {
    values.push(value);
  }
}

function selectSignatureTexts(page: UIPage, limit: number): string[] {
  return (page.signatureTexts || []).slice(0, limit);
}

function mergeTopPages(
  currentPageCandidates: RuntimePageRef[],
  targetPageCandidates: RuntimePageRef[],
  limit: number,
): RuntimePageRef[] {
  const byId = new Map<string, RuntimePageRef>();
  for (const candidate of [...currentPageCandidates, ...targetPageCandidates]) {
    const existing = byId.get(candidate.id);
    if (!existing || candidate.score > existing.score) {
      byId.set(candidate.id, candidate);
    }
  }
  return [...byId.values()].sort((left, right) => right.score - left.score).slice(0, limit);
}

function buildExpansionHints(view: Pick<RuntimeMapView, 'pages' | 'elements' | 'taskHint'>): string[] {
  const hints: string[] = [];
  const firstPageId = Object.keys(view.pages)[0];
  if (firstPageId) {
    hints.push(`expand-page:${firstPageId}`);
  }
  const firstElementId = Object.keys(view.elements)[0];
  if (firstElementId) {
    hints.push(`expand-locators:${firstElementId}`);
  }
  return hints;
}

export function buildRuntimeMapView(
  fullMap: UIMap,
  budget: RuntimeBudget,
  taskHint?: RuntimeTaskHint,
): RuntimeMapView {
  const currentPageCandidates = Object.values(fullMap.pages)
    .filter((page) => page.confidence >= budget.minPageConfidence)
    .map((page) => ({ page, score: scorePage(page, fullMap, taskHint, 'current') }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, budget.maxPageCandidates)
    .map(({ page, score }) => buildPageRef(page, score));

  const targetPageCandidates = Object.values(fullMap.pages)
    .filter((page) => page.confidence >= budget.minPageConfidence)
    .map((page) => ({ page, score: scorePage(page, fullMap, taskHint, 'target') }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, budget.maxPageCandidates)
    .map(({ page, score }) => buildPageRef(page, score));

  const selectedPages = mergeTopPages(
    currentPageCandidates,
    targetPageCandidates,
    budget.maxPageCandidates,
  );

  const pages: Record<string, RuntimePageView> = {};
  const elements: Record<string, RuntimeElementRef> = {};
  let totalElements = 0;
  let truncated = false;

  for (const pageRef of selectedPages) {
    const page = fullMap.pages[pageRef.id];
    if (!page) continue;

    const pageElements = Object.values(fullMap.elements)
      .filter((element) => element.pageId === page.id && element.confidence >= budget.minElementConfidence)
      .map((element) => ({ element, score: scoreElement(element, taskHint) }))
      .filter(({ score }) => score > 0)
      .sort((left, right) => right.score - left.score);

    const selectedElements = pageElements.slice(0, budget.maxElementsPerPage);
    if (pageElements.length > selectedElements.length) {
      truncated = true;
    }

    if (totalElements + selectedElements.length > budget.maxTotalElements) {
      truncated = true;
      break;
    }

    const pageView: RuntimePageView = {
      page: pageRef,
      signatureTexts: selectSignatureTexts(page, budget.maxSignatureTextsPerPage),
      navigationElementIds: [],
      primaryActionElementIds: [],
      inputElementIds: [],
      anchorElementIds: [],
    };

    for (const { element, score } of selectedElements) {
      const runtimeElement = buildRuntimeElement(element, budget, score);
      elements[runtimeElement.id] = runtimeElement;
      totalElements++;

      if (runtimeElement.role === 'navigation' && budget.includeNavigationElements) {
        appendUnique(pageView.navigationElementIds, runtimeElement.id);
      } else if (runtimeElement.role === 'input' && budget.includeInputElements) {
        appendUnique(pageView.inputElementIds, runtimeElement.id);
      } else if (
        (runtimeElement.role === 'action' ||
          runtimeElement.role === 'confirm' ||
          runtimeElement.role === 'dismiss') &&
        budget.includePrimaryActionElements
      ) {
        appendUnique(pageView.primaryActionElementIds, runtimeElement.id);
      } else if (budget.includeAnchorElements || runtimeElement.role === 'content') {
        appendUnique(pageView.anchorElementIds, runtimeElement.id);
      }
    }

    pages[page.id] = pageView;
  }

  const transitions = budget.includePageTransitions
    ? fullMap.navigation.filter(
      (edge) => pages[edge.fromPageId] || pages[edge.toPageId],
    )
    : undefined;

  const view: RuntimeMapView = {
    mode: budget.mode,
    budget,
    taskHint,
    currentPageCandidates,
    targetPageCandidates,
    pages,
    elements,
    transitions,
    truncated,
    expansionHints: [],
  };

  view.expansionHints = truncated ? buildExpansionHints(view) : [];
  return view;
}

function mergeExpandedBudget(
  budget: RuntimeBudget,
  request: ExpandRequest,
): RuntimeBudget {
  return {
    ...budget,
    maxPageCandidates: budget.maxPageCandidates + (request.addPages ?? 0),
    maxElementsPerPage: budget.maxElementsPerPage + (request.addElementsPerPage ?? 0),
    maxLocatorsPerElement: budget.maxLocatorsPerElement + (request.addLocatorsPerElement ?? 0),
    includeNeighborRelations: request.includeNeighborRelations ?? budget.includeNeighborRelations,
    includeContentTemplates: request.includeContentTemplates ?? budget.includeContentTemplates,
    includePageTransitions: request.includeTransitions ?? budget.includePageTransitions,
  };
}

export function expandRuntimeMapView(
  fullMap: UIMap,
  currentView: RuntimeMapView,
  request: ExpandRequest,
): RuntimeMapView {
  const nextBudget = mergeExpandedBudget(currentView.budget, request);
  const focusedTaskHint: RuntimeTaskHint = {
    ...currentView.taskHint,
    currentPageId: request.focusPageId || currentView.taskHint?.currentPageId,
  };

  const rebuilt = buildRuntimeMapView(fullMap, nextBudget, focusedTaskHint);

  if (request.focusElementId && rebuilt.elements[request.focusElementId] && currentView.elements[request.focusElementId]) {
    rebuilt.elements[request.focusElementId] = {
      ...rebuilt.elements[request.focusElementId],
      locators: selectTopLocators(
        fullMap.elements[request.focusElementId]?.locatorStrategies || [],
        nextBudget,
      ),
    };
  }

  return {
    ...rebuilt,
    expansionHints: rebuilt.truncated ? buildExpansionHints(rebuilt) : [],
  };
}

export function buildRuntimeMapViewPrompt(view: RuntimeMapView): string {
  const sections: string[] = [
    '## Runtime Map View',
    `Mode: ${view.mode}`,
  ];

  if (view.currentPageCandidates.length > 0) {
    sections.push(
      '',
      '### Current Page Candidates',
      ...view.currentPageCandidates.map(
        (candidate) => `- ${candidate.id}${candidate.label ? ` (${candidate.label})` : ''}`,
      ),
    );
  }

  if (view.targetPageCandidates.length > 0) {
    sections.push(
      '',
      '### Target Page Candidates',
      ...view.targetPageCandidates.map(
        (candidate) => `- ${candidate.id}${candidate.label ? ` (${candidate.label})` : ''}`,
      ),
    );
  }

  for (const pageView of Object.values(view.pages)) {
    sections.push(
      '',
      `### Page ${pageView.page.id}${pageView.page.label ? ` (${pageView.page.label})` : ''}`,
    );

    if (pageView.signatureTexts.length > 0) {
      sections.push(`- Signature: ${pageView.signatureTexts.join(', ')}`);
    }

    const renderBucket = (title: string, ids: string[]) => {
      if (ids.length === 0) return;
      sections.push(`- ${title}:`);
      for (const id of ids) {
        const element = view.elements[id];
        if (!element) continue;
        const primaryLocator = element.locators[0];
        sections.push(
          `  - ${element.id}${element.label ? ` (${element.label})` : ''} [role=${element.role}]${primaryLocator ? ` locator=${primaryLocator.type}` : ''}`,
        );
      }
    };

    renderBucket('Navigation', pageView.navigationElementIds);
    renderBucket('Primary Actions', pageView.primaryActionElementIds);
    renderBucket('Inputs', pageView.inputElementIds);
    renderBucket('Anchors', pageView.anchorElementIds);
  }

  if (view.transitions && view.transitions.length > 0) {
    sections.push(
      '',
      '### Known Transitions',
      ...view.transitions.map(
        (transition) => `- ${transition.fromPageId} -> ${transition.toPageId} via ${transition.viaElementId}`,
      ),
    );
  }

  return sections.join('\n');
}
