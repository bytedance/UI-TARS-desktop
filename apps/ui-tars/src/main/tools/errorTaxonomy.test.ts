/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it } from 'vitest';

import { ErrorStatusEnum } from '@ui-tars/shared/types';

import { classifyRuntimeErrorV1 } from './errorTaxonomy';

describe('errorTaxonomy', () => {
  it('classifies auth-style errors', () => {
    const taxonomy = classifyRuntimeErrorV1(
      new Error('[INVOKE_GATE_DENY] auth_state_invalid'),
    );

    expect(taxonomy.errorClass).toBe('auth');
    expect(taxonomy.retryable).toBe(false);
  });

  it('classifies timeout-style errors as retryable', () => {
    const taxonomy = classifyRuntimeErrorV1(
      new Error('request timed out after 30s'),
    );

    expect(taxonomy.errorClass).toBe('timeout');
    expect(taxonomy.retryable).toBe(true);
  });

  it('classifies transient network errors as retryable', () => {
    const taxonomy = classifyRuntimeErrorV1(
      new Error('ECONNRESET from upstream'),
    );

    expect(taxonomy.errorClass).toBe('transient');
    expect(taxonomy.retryable).toBe(true);
  });

  it('classifies parse/validation errors as format', () => {
    const taxonomy = classifyRuntimeErrorV1(
      new Error('action_type_unsupported for malformed action'),
    );

    expect(taxonomy.errorClass).toBe('format');
    expect(taxonomy.retryable).toBe(false);
  });

  it('classifies tool execution errors as execute', () => {
    const taxonomy = classifyRuntimeErrorV1(
      new Error('[TOOL_FIRST_ROUTE_UNHANDLED] tool_failed:non_zero_exit'),
    );

    expect(taxonomy.errorClass).toBe('execute');
    expect(taxonomy.retryable).toBe(false);
  });

  it('prefers structured status code mapping when provided', () => {
    const taxonomy = classifyRuntimeErrorV1({
      status: ErrorStatusEnum.MODEL_SERVICE_ERROR,
      message: 'backend 503',
    });

    expect(taxonomy.errorClass).toBe('transient');
    expect(taxonomy.source).toBe('model');
    expect(taxonomy.retryable).toBe(true);
  });

  it('falls back to unknown for unmatched errors', () => {
    const taxonomy = classifyRuntimeErrorV1({ foo: 'bar' });

    expect(taxonomy.errorClass).toBe('unknown');
    expect(taxonomy.retryable).toBe(false);
  });
});
