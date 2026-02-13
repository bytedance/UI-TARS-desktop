/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

export const CODEX_AUTH_COOLDOWN_MS = 60 * 1000;
export const CODEX_AUTH_COOLDOWN_ERROR_CODE = 'CODEX_OAUTH_COOLDOWN_ACTIVE';

export type CodexAuthCooldownSnapshot = {
  active: boolean;
  until?: number;
  remainingMs?: number;
  reason?: string;
};

export class CodexAuthCooldown {
  private cooldownUntil: number | null = null;
  private reason: string | null = null;

  public activate(reason: string, durationMs = CODEX_AUTH_COOLDOWN_MS): void {
    this.cooldownUntil = Date.now() + Math.max(0, durationMs);
    this.reason = reason;
  }

  public clear(): void {
    this.cooldownUntil = null;
    this.reason = null;
  }

  public snapshot(now = Date.now()): CodexAuthCooldownSnapshot {
    if (!this.cooldownUntil || this.cooldownUntil <= now) {
      this.clear();
      return { active: false };
    }

    return {
      active: true,
      until: this.cooldownUntil,
      remainingMs: this.cooldownUntil - now,
      reason: this.reason || undefined,
    };
  }

  public assertReady(now = Date.now()): void {
    const cooldown = this.snapshot(now);
    if (!cooldown.active) {
      return;
    }

    const remainingSeconds = Math.max(
      1,
      Math.ceil((cooldown.remainingMs || 0) / 1000),
    );
    const reason = cooldown.reason ? ` ${cooldown.reason}` : '';
    throw new Error(
      `[${CODEX_AUTH_COOLDOWN_ERROR_CODE}] OpenAI Codex OAuth is in cooldown for ${remainingSeconds}s.${reason}`,
    );
  }
}
