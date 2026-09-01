/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it } from 'vitest';

import { shouldExcludeDomain } from './url';

describe('shouldExcludeDomain', () => {
  it('matches exact domains and their subdomains', () => {
    const excludedDomains = ['example.com'];

    expect(
      shouldExcludeDomain('https://example.com/page', excludedDomains),
    ).toBe(true);
    expect(
      shouldExcludeDomain('https://docs.example.com/page', excludedDomains),
    ).toBe(true);
  });

  it('does not match hostname lookalikes', () => {
    const excludedDomains = ['example.com'];

    expect(
      shouldExcludeDomain('https://example.com.evil.test', excludedDomains),
    ).toBe(false);
    expect(
      shouldExcludeDomain('https://notexample.com/page', excludedDomains),
    ).toBe(false);
  });

  it('normalizes schemes, paths, wildcards, case, and trailing dots', () => {
    const excludedDomains = [' HTTPS://Example.COM/path ', '*.blocked.test'];

    expect(shouldExcludeDomain('https://EXAMPLE.com./', excludedDomains)).toBe(
      true,
    );
    expect(
      shouldExcludeDomain('https://api.blocked.test/', excludedDomains),
    ).toBe(true);
  });

  it('ignores empty or invalid excluded-domain entries', () => {
    expect(shouldExcludeDomain('https://example.com', ['', '://invalid'])).toBe(
      false,
    );
  });
});
