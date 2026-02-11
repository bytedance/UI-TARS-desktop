/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

const REDACTED_VALUE = '[REDACTED]';

const SENSITIVE_KEY_PATTERNS = [
  /token/i,
  /api[-_]?key/i,
  /authorization/i,
  /password/i,
  /secret/i,
  /cookie/i,
  /session/i,
  /refresh/i,
  /chatgpt-account-id/i,
];

const SENSITIVE_STRING_PATTERNS = [
  {
    pattern: /Bearer\s+[A-Za-z0-9._~+/=-]+/gi,
    replacement: `Bearer ${REDACTED_VALUE}`,
  },
  {
    pattern: /(\"?(?:access|refresh|id)_token\"?\s*[:=]\s*\"?)([^\"\s,}]+)/gi,
    replacement: `$1${REDACTED_VALUE}`,
  },
  {
    pattern: /(sk-[A-Za-z0-9_-]{10,})/g,
    replacement: REDACTED_VALUE,
  },
];

const shouldRedactKey = (key: string): boolean => {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
};

const redactString = (value: string): string => {
  return SENSITIVE_STRING_PATTERNS.reduce(
    (result, { pattern, replacement }) => {
      return result.replace(pattern, replacement);
    },
    value,
  );
};

const redactInternal = (value: unknown, seen: WeakSet<object>): unknown => {
  if (typeof value === 'string') {
    return redactString(value);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  if (seen.has(value)) {
    return '[Circular]';
  }

  seen.add(value);

  if (value instanceof Error) {
    const redactedError: Record<string, unknown> = {
      name: value.name,
      message: redactString(value.message),
    };

    if (typeof value.stack === 'string') {
      redactedError.stack = redactString(value.stack);
    }

    const errorWithCause = value as Error & { cause?: unknown };
    if (errorWithCause.cause !== undefined) {
      redactedError.cause = redactInternal(errorWithCause.cause, seen);
    }

    for (const [key, entryValue] of Object.entries(value)) {
      if (
        key === 'name' ||
        key === 'message' ||
        key === 'stack' ||
        key === 'cause'
      ) {
        continue;
      }

      if (shouldRedactKey(key)) {
        redactedError[key] = REDACTED_VALUE;
      } else {
        redactedError[key] = redactInternal(entryValue, seen);
      }
    }

    return redactedError;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactInternal(item, seen));
  }

  const entries = Object.entries(value as Record<string, unknown>).map(
    ([key, entryValue]) => {
      if (shouldRedactKey(key)) {
        return [key, REDACTED_VALUE];
      }
      return [key, redactInternal(entryValue, seen)];
    },
  );

  return Object.fromEntries(entries);
};

export const redactSensitiveData = <T>(value: T): T => {
  return redactInternal(value, new WeakSet()) as T;
};
