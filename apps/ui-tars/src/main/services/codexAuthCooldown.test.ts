/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it, vi } from 'vitest';

import {
  CODEX_AUTH_COOLDOWN_ERROR_CODE,
  CODEX_AUTH_COOLDOWN_MS,
  CodexAuthCooldown,
} from './codexAuthCooldown';

describe('CodexAuthCooldown', () => {
  it('activates cooldown and reports remaining budget', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-13T00:00:00.000Z'));

    const cooldown = new CodexAuthCooldown();
    cooldown.activate('refresh failed');

    const snapshot = cooldown.snapshot();
    expect(snapshot.active).toBe(true);
    expect(snapshot.remainingMs).toBe(CODEX_AUTH_COOLDOWN_MS);
    expect(snapshot.reason).toBe('refresh failed');

    vi.useRealTimers();
  });

  it('expires cooldown automatically after deadline', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-13T00:00:00.000Z'));

    const cooldown = new CodexAuthCooldown();
    cooldown.activate('expired soon', 5_000);

    vi.advanceTimersByTime(5_001);
    const snapshot = cooldown.snapshot();
    expect(snapshot.active).toBe(false);

    vi.useRealTimers();
  });

  it('throws explicit cooldown error while active', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-13T00:00:00.000Z'));

    const cooldown = new CodexAuthCooldown();
    cooldown.activate('token refresh failed', 10_000);

    expect(() => cooldown.assertReady()).toThrow(
      CODEX_AUTH_COOLDOWN_ERROR_CODE,
    );
    expect(() => cooldown.assertReady()).toThrow('token refresh failed');

    vi.useRealTimers();
  });
});
