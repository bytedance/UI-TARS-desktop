/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import type {
  CompletionPolicy,
  RuntimeIntent,
  RuntimeMapView,
  RuntimePageRef,
  RuntimeResolvedElementCandidate,
} from './types';
import {
  DEFAULT_RUNTIME_LOCALE,
  containsLocaleTerm,
  splitCompositeQueryWithLocale,
  type RuntimeLocaleConfig,
} from './runtime-locale';

const MIN_PAGE_CANDIDATE_SCORE = 0.72;
const MIN_ELEMENT_CANDIDATE_SCORE = 0.72;

function normalizeText(value: string | undefined): string {
  if (!value) {
    return '';
  }

  return value
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[\s\p{P}\p{S}]+/gu, '');
}

function tokenizeText(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .toLowerCase()
    .normalize('NFKC')
    .match(/[\p{L}\p{N}]+/gu) || [];
}

function scoreTextMatch(query: string, candidates: string[]): number {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return 0;
  }

  const queryTokens = new Set(tokenizeText(query));
  let bestScore = 0;

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeText(candidate);
    if (!normalizedCandidate) {
      continue;
    }

    if (normalizedQuery === normalizedCandidate) {
      return 1;
    }

    if (normalizedQuery.includes(normalizedCandidate)) {
      bestScore = Math.max(bestScore, 0.92);
      continue;
    }

    if (normalizedCandidate.includes(normalizedQuery)) {
      bestScore = Math.max(bestScore, 0.82);
      continue;
    }

    const candidateTokens = tokenizeText(candidate);
    if (queryTokens.size === 0 || candidateTokens.length === 0) {
      continue;
    }

    const overlap = candidateTokens.filter((token) => queryTokens.has(token)).length;
    if (overlap > 0) {
      bestScore = Math.max(bestScore, overlap / candidateTokens.length);
    }
  }

  return bestScore;
}

function getRuntimePageCandidates(view: RuntimeMapView): RuntimePageRef[] {
  const byId = new Map<string, RuntimePageRef>();

  for (const candidate of [...view.currentPageCandidates, ...view.targetPageCandidates]) {
    const existing = byId.get(candidate.id);
    if (!existing || candidate.score > existing.score) {
      byId.set(candidate.id, candidate);
    }
  }

  return [...byId.values()];
}

function resolvePageCandidates(query: string, view: RuntimeMapView): RuntimePageRef[] {
  return getRuntimePageCandidates(view)
    .map((candidate) => {
      const textScore = scoreTextMatch(query, [candidate.label || '', ...(candidate.aliases || [])]);
      return {
        ...candidate,
        score: textScore > 0 ? textScore + candidate.confidence * 0.05 : 0,
      };
    })
    .filter((candidate) => candidate.score >= MIN_PAGE_CANDIDATE_SCORE)
    .sort((left, right) => right.score - left.score);
}

function resolveElementCandidates(
  query: string,
  view: RuntimeMapView,
  pageId?: string,
): RuntimeResolvedElementCandidate[] {
  return Object.values(view.elements)
    .filter((element) => !pageId || element.pageId === pageId)
    .map((element) => {
      const textScore = scoreTextMatch(query, [element.label || '', ...(element.aliases || [])]);
      return {
        elementId: element.id,
        pageId: element.pageId,
        role: element.role,
        action: element.action,
        label: element.label,
        aliases: element.aliases,
        confidence: element.confidence,
        score: textScore > 0 ? textScore + element.confidence * 0.05 : 0,
      };
    })
    .filter((candidate) => candidate.score >= MIN_ELEMENT_CANDIDATE_SCORE)
    .sort((left, right) => right.score - left.score);
}

function resolveCompletionPolicy(
  query: string,
  elementCandidates: RuntimeResolvedElementCandidate[],
  locale: RuntimeLocaleConfig,
): Exclude<CompletionPolicy, 'stop_on_page_arrival'> {
  const topElement = elementCandidates[0];
  if (topElement && (topElement.role === 'input' || topElement.action === 'input')) {
    return 'stop_after_content_action';
  }

  if (containsLocaleTerm(query, locale.contentActionTerms)) {
    return 'stop_after_content_action';
  }

  return 'stop_on_target_open';
}

function buildNavigateIntent(query: string, targetPage: RuntimePageRef): RuntimeIntent {
  return {
    kind: 'navigate',
    rawQuery: query,
    targetPage,
    completionPolicy: 'stop_on_page_arrival',
  };
}

function stripPageReference(query: string, targetPage: RuntimePageRef): string {
  const matchedTerms = [targetPage.label || '', ...(targetPage.aliases || [])]
    .filter(Boolean)
    .sort((left, right) => right.length - left.length);

  let remainder = query;
  for (const term of matchedTerms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    remainder = remainder.replace(new RegExp(escaped, 'i'), ' ');
  }

  return remainder.replace(/^[,，。、；;:\s]+|[,，。、；;:\s]+$/g, '').trim();
}

export function shouldUseRuntimeMapView(
  query: string,
  view: RuntimeMapView,
  locale: RuntimeLocaleConfig = DEFAULT_RUNTIME_LOCALE,
): boolean {
  const intent = parseRuntimeIntent(query, view, locale);
  return intent.kind === 'navigate' || intent.kind === 'navigate_then_act';
}

export function extractTargetPageLabelFromRuntimeMapView(
  query: string,
  view: RuntimeMapView,
  locale: RuntimeLocaleConfig = DEFAULT_RUNTIME_LOCALE,
): string | null {
  const intent = parseRuntimeIntent(query, view, locale);

  if (intent.kind === 'navigate' || intent.kind === 'navigate_then_act') {
    return intent.targetPage.label || null;
  }

  return intent.targetPage?.label || null;
}

export function extractNavigationSubtaskFromRuntimeMapView(
  query: string,
  view: RuntimeMapView,
  locale: RuntimeLocaleConfig = DEFAULT_RUNTIME_LOCALE,
): { navigationQuery: string; remainingQuery: string } | null {
  const intent = parseRuntimeIntent(query, view, locale);
  if (intent.kind !== 'navigate_then_act') {
    return null;
  }

  return {
    navigationQuery: intent.navigationQuery,
    remainingQuery: intent.remainingQuery,
  };
}

export function parseRuntimeIntent(
  query: string,
  view: RuntimeMapView,
  locale: RuntimeLocaleConfig = DEFAULT_RUNTIME_LOCALE,
): RuntimeIntent {
  const compositeSegments = splitCompositeQueryWithLocale(query, locale);
  if (compositeSegments.length > 1) {
    const [navigationQuery, ...remainingSegments] = compositeSegments;
    const pageCandidates = resolvePageCandidates(navigationQuery, view);
    if (pageCandidates.length > 0) {
      const remainingQuery = remainingSegments.join(', ');
      const targetElements = resolveElementCandidates(
        remainingQuery,
        view,
        pageCandidates[0].id,
      );

      return {
        kind: 'navigate_then_act',
        rawQuery: query,
        navigationQuery,
        remainingQuery,
        targetPage: pageCandidates[0],
        targetElements,
        completionPolicy: resolveCompletionPolicy(
          remainingQuery,
          targetElements,
          locale,
        ),
      };
    }
  }

  const pageCandidates = resolvePageCandidates(query, view);
  const elementCandidates = resolveElementCandidates(query, view);
  const topPage = pageCandidates[0];
  const topElement = elementCandidates[0];

  if (
    topElement &&
    (!topPage ||
      topElement.score >= topPage.score ||
      containsLocaleTerm(query, locale.contentActionTerms))
  ) {
    const targetPage = getRuntimePageCandidates(view).find(
      (candidate) => candidate.id === topElement.pageId,
    );

    return {
      kind: 'act',
      rawQuery: query,
      actionQuery: query,
      targetPage,
      targetElements: elementCandidates,
      completionPolicy: resolveCompletionPolicy(query, elementCandidates, locale),
    };
  }

  if (topPage) {
    const remainder = stripPageReference(query, topPage);
    if (remainder.length > 0) {
      const targetElements = resolveElementCandidates(remainder, view, topPage.id);
      if (targetElements.length > 0 || containsLocaleTerm(remainder, locale.contentActionTerms)) {
        return {
          kind: 'navigate_then_act',
          rawQuery: query,
          navigationQuery: topPage.label
            ? `Open the page "${topPage.label}"`
            : `Open the page ${topPage.id}`,
          remainingQuery: remainder,
          targetPage: topPage,
          targetElements,
          completionPolicy: resolveCompletionPolicy(remainder, targetElements, locale),
        };
      }
    }

    return buildNavigateIntent(query, topPage);
  }

  return {
    kind: 'act',
    rawQuery: query,
    actionQuery: query,
    targetPage: undefined,
    targetElements: elementCandidates,
    completionPolicy: resolveCompletionPolicy(query, elementCandidates, locale),
  };
}
