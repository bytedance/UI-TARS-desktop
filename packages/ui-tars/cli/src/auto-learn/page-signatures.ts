/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { LayoutType, PageSignature } from './types';

export const DEFAULT_PAGE_SIGNATURES: PageSignature[] = [];

function findPageSignature(
  pageName: string,
  signatures: PageSignature[] = DEFAULT_PAGE_SIGNATURES,
): PageSignature | undefined {
  return signatures.find((signature) => signature.name === pageName);
}

export function matchPageSignature(
  description: string,
  parentPage?: string,
  signatures: PageSignature[] = DEFAULT_PAGE_SIGNATURES,
): string {
  if (signatures.length === 0) {
    return 'Unknown';
  }

  const lowerDesc = description.toLowerCase();

  let bestMatch: PageSignature | null = null;
  let bestScore = 0;

  for (const signature of signatures) {
    let score = 0;

    for (const feature of signature.features) {
      if (lowerDesc.includes(feature.toLowerCase())) {
        score += 1;
      }
    }

    if (signature.notFeatures) {
      for (const notFeature of signature.notFeatures) {
        if (lowerDesc.includes(notFeature.toLowerCase())) {
          score -= 3;
        }
      }
    }

    if (
      parentPage &&
      signature.parentTypes &&
      signature.parentTypes.includes(parentPage)
    ) {
      score += 1;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = signature;
    }
  }

  if (bestMatch && bestScore > 0) {
    return bestMatch.name;
  }

  return 'Unknown';
}

export function getLayoutType(
  pageName: string,
  signatures: PageSignature[] = DEFAULT_PAGE_SIGNATURES,
): LayoutType {
  return findPageSignature(pageName, signatures)?.layout || 'unknown';
}

export function isSecondaryPage(
  pageName: string,
  signatures: PageSignature[] = DEFAULT_PAGE_SIGNATURES,
): boolean {
  const signature = findPageSignature(pageName, signatures);
  return signature?.parentTypes !== undefined && signature.parentTypes.length > 0;
}
