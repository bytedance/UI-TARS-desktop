/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import {
  matchPageSignature,
  getLayoutType,
  isSecondaryPage,
} from '../page-signatures';
import type { PageSignature } from '../types';

const GENERIC_SIGNATURES: PageSignature[] = [
  {
    name: 'RootFeed',
    features: ['banner', 'card', 'carousel'],
    notFeatures: ['filter rail'],
    layout: 'scrollable-feed',
  },
  {
    name: 'SearchResults',
    features: ['search', 'result'],
    layout: 'list',
    parentTypes: ['RootFeed'],
  },
  {
    name: 'DetailPage',
    features: ['hero image', 'summary', 'play'],
    layout: 'form',
    parentTypes: ['RootFeed'],
  },
];

describe('matchPageSignature', () => {
  it('returns Unknown when no signatures are configured', () => {
    expect(matchPageSignature('banner carousel with cards')).toBe('Unknown');
    expect(matchPageSignature('search input with result list', 'RootFeed')).toBe('Unknown');
  });

  it('matches caller-provided generic signatures', () => {
    expect(
      matchPageSignature('banner carousel with cards', undefined, GENERIC_SIGNATURES),
    ).toBe('RootFeed');
    expect(
      matchPageSignature('search input with result list', 'RootFeed', GENERIC_SIGNATURES),
    ).toBe('SearchResults');
  });

  it('uses negative features to reduce false positives', () => {
    const result = matchPageSignature(
      'banner carousel with filter rail',
      undefined,
      GENERIC_SIGNATURES,
    );
    expect(result).toBe('Unknown');
  });
});

describe('getLayoutType', () => {
  it('returns unknown without configured signatures', () => {
    expect(getLayoutType('RootFeed')).toBe('unknown');
    expect(getLayoutType('Unknown')).toBe('unknown');
  });

  it('returns the configured layout for known generic pages', () => {
    expect(getLayoutType('RootFeed', GENERIC_SIGNATURES)).toBe('scrollable-feed');
    expect(getLayoutType('SearchResults', GENERIC_SIGNATURES)).toBe('list');
    expect(getLayoutType('DetailPage', GENERIC_SIGNATURES)).toBe('form');
  });
});

describe('isSecondaryPage', () => {
  it('returns false without configured signatures', () => {
    expect(isSecondaryPage('DetailPage')).toBe(false);
    expect(isSecondaryPage('Unknown')).toBe(false);
  });

  it('returns true only for pages with parentTypes', () => {
    expect(isSecondaryPage('RootFeed', GENERIC_SIGNATURES)).toBe(false);
    expect(isSecondaryPage('SearchResults', GENERIC_SIGNATURES)).toBe(true);
    expect(isSecondaryPage('DetailPage', GENERIC_SIGNATURES)).toBe(true);
  });
});
