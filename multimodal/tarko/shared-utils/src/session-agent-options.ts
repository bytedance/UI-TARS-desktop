/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Agent option keys a client may supply when creating a session.
 *
 * Session creation payloads are merged into the Agent constructor options, so an
 * unrestricted object turns the create-session endpoint into arbitrary Agent
 * reconfiguration: `mcpServers` entries carrying a `command` spawn local child
 * processes, `aioSandbox` decides whether work runs in a sandbox or on the host,
 * and `model` / `agio` redirect credentials and telemetry to a chosen endpoint.
 *
 * Only keys that a session legitimately needs to vary belong here, and only
 * those that cannot start a process, change an outbound endpoint, or carry a
 * credential. `agentMode` is the single such key in use today: it selects a
 * preset interaction mode and is consumed by the GUI agent plugin.
 */
export const ALLOWED_SESSION_AGENT_OPTION_KEYS = ['agentMode'] as const;

export type AllowedSessionAgentOptionKey = (typeof ALLOWED_SESSION_AGENT_OPTION_KEYS)[number];

/** Keys that would let a payload reach an object prototype. */
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** Guards against pathological nesting in an attacker-supplied payload. */
const MAX_VALUE_DEPTH = 6;

export interface SanitizeResult<T> {
  /** The values that survived sanitization. */
  value: T;
  /** Keys that were dropped, for error responses and audit logs. */
  rejectedKeys: string[];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Whether a value is safe to hand to an Agent constructor: plain JSON data only,
 * no prototype-reaching keys, no functions, bounded depth.
 */
function isJsonSafeValue(value: unknown, depth = 0): boolean {
  if (depth > MAX_VALUE_DEPTH) {
    return false;
  }

  if (value === null) {
    return true;
  }

  switch (typeof value) {
    case 'string':
    case 'boolean':
      return true;
    case 'number':
      return Number.isFinite(value);
    case 'object':
      break;
    default:
      return false;
  }

  if (Array.isArray(value)) {
    return value.every((item) => isJsonSafeValue(item, depth + 1));
  }

  if (!isPlainObject(value)) {
    return false;
  }

  return Object.keys(value).every(
    (key) => !FORBIDDEN_KEYS.has(key) && isJsonSafeValue(value[key], depth + 1),
  );
}

/**
 * Reduce a client-supplied `agentOptions` payload to the allowlist.
 *
 * Anything outside {@link ALLOWED_SESSION_AGENT_OPTION_KEYS}, and any allowlisted
 * key whose value is not plain JSON data, is reported in `rejectedKeys` and left
 * out of `value`.
 */
export function sanitizeSessionAgentOptions(
  input: unknown,
): SanitizeResult<Record<string, unknown> | undefined> {
  if (input === undefined || input === null) {
    return { value: undefined, rejectedKeys: [] };
  }

  if (!isPlainObject(input)) {
    return { value: undefined, rejectedKeys: ['<agentOptions must be an object>'] };
  }

  const allowed = new Set<string>(ALLOWED_SESSION_AGENT_OPTION_KEYS);
  const sanitized: Record<string, unknown> = {};
  const rejectedKeys: string[] = [];

  for (const key of Object.keys(input)) {
    if (!allowed.has(key) || FORBIDDEN_KEYS.has(key) || !isJsonSafeValue(input[key])) {
      rejectedKeys.push(key);
      continue;
    }
    sanitized[key] = input[key];
  }

  return {
    value: Object.keys(sanitized).length > 0 ? sanitized : undefined,
    rejectedKeys,
  };
}

/**
 * Minimal shape of the server-declared runtime settings schema this module needs.
 */
export interface RuntimeSettingsSchemaLike {
  properties?: Record<string, { type?: 'boolean' | 'string' | 'number' } | undefined>;
}

/**
 * Reduce a client-supplied `runtimeSettings` payload to the keys the server declared.
 *
 * Runtime settings are merged into the Agent constructor options too, so an
 * undeclared key is the same injection channel as `agentOptions`. The server's
 * schema is the contract the UI renders from, so a key that is not declared in it
 * is not a setting. Declared keys must also match their declared primitive type.
 *
 * With no schema configured nothing is passed through.
 */
export function filterDeclaredRuntimeSettings(
  input: unknown,
  schema?: RuntimeSettingsSchemaLike,
): SanitizeResult<Record<string, unknown>> {
  if (!isPlainObject(input)) {
    return { value: {}, rejectedKeys: [] };
  }

  const properties = schema?.properties;
  const filtered: Record<string, unknown> = {};
  const rejectedKeys: string[] = [];

  for (const key of Object.keys(input)) {
    const declared = FORBIDDEN_KEYS.has(key) ? undefined : properties?.[key];
    if (!declared) {
      rejectedKeys.push(key);
      continue;
    }

    const value = input[key];
    const matchesDeclaredType =
      declared.type === undefined
        ? typeof value === 'boolean' || typeof value === 'string' || typeof value === 'number'
        : declared.type === 'number'
          ? typeof value === 'number' && Number.isFinite(value)
          : typeof value === declared.type;

    if (!matchesDeclaredType) {
      rejectedKeys.push(key);
      continue;
    }

    filtered[key] = value;
  }

  return { value: filtered, rejectedKeys };
}
