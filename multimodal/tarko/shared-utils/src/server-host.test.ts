/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SERVER_HOST,
  formatServerUrl,
  isExternallyReachableHost,
  resolveServerHost,
} from './server-host';

describe('resolveServerHost', () => {
  it('defaults to loopback', () => {
    expect(DEFAULT_SERVER_HOST).toBe('127.0.0.1');
    expect(resolveServerHost(undefined)).toBe('127.0.0.1');
    expect(resolveServerHost('')).toBe('127.0.0.1');
    expect(resolveServerHost('   ')).toBe('127.0.0.1');
  });

  it('honours an explicit host', () => {
    expect(resolveServerHost('0.0.0.0')).toBe('0.0.0.0');
    expect(resolveServerHost(' 192.168.1.10 ')).toBe('192.168.1.10');
  });
});

describe('isExternallyReachableHost', () => {
  it('treats loopback as not reachable', () => {
    for (const host of ['127.0.0.1', '127.0.0.2', 'localhost', '::1', '[::1]']) {
      expect(isExternallyReachableHost(host)).toBe(false);
    }
  });

  it('treats wildcard and routable addresses as reachable', () => {
    for (const host of ['0.0.0.0', '::', '192.168.1.10', '10.0.0.5']) {
      expect(isExternallyReachableHost(host)).toBe(true);
    }
  });
});

describe('formatServerUrl', () => {
  it('renders wildcard binds as localhost', () => {
    expect(formatServerUrl('0.0.0.0', 8888)).toBe('http://localhost:8888');
    expect(formatServerUrl('::', 8888)).toBe('http://localhost:8888');
  });

  it('renders a concrete host as-is', () => {
    expect(formatServerUrl('127.0.0.1', 8888)).toBe('http://127.0.0.1:8888');
    expect(formatServerUrl('192.168.1.10', 3000)).toBe('http://192.168.1.10:3000');
  });

  it('brackets IPv6 hosts', () => {
    expect(formatServerUrl('::1', 8888)).toBe('http://[::1]:8888');
    expect(formatServerUrl('[::1]', 8888)).toBe('http://[::1]:8888');
  });
});
