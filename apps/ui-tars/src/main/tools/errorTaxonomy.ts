/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { ErrorStatusEnum } from '@ui-tars/shared/types';

export const ERROR_TAXONOMY_VERSION = 'v1' as const;

export type ErrorTaxonomyClass =
  | 'auth'
  | 'timeout'
  | 'transient'
  | 'format'
  | 'execute'
  | 'unknown';

export type ErrorTaxonomySource =
  | 'agent'
  | 'model'
  | 'gate'
  | 'tool'
  | 'runtime'
  | 'unknown';

export type ErrorTaxonomyV1 = {
  version: typeof ERROR_TAXONOMY_VERSION;
  errorClass: ErrorTaxonomyClass;
  source: ErrorTaxonomySource;
  code: string;
  retryable: boolean;
  rawMessage: string;
};

const toRawMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (typeof error === 'object' && error !== null) {
    const record = error as Record<string, unknown>;
    if (typeof record.message === 'string') {
      return record.message;
    }
  }

  return String(error);
};

const toStatusCode = (error: unknown): number | null => {
  if (typeof error === 'object' && error !== null) {
    const record = error as Record<string, unknown>;
    if (typeof record.status === 'number' && Number.isFinite(record.status)) {
      return record.status;
    }
  }
  return null;
};

const byStatusCode = (statusCode: number | null): ErrorTaxonomyV1 | null => {
  if (statusCode === null) {
    return null;
  }

  if (statusCode === ErrorStatusEnum.MODEL_SERVICE_ERROR) {
    return {
      version: ERROR_TAXONOMY_VERSION,
      errorClass: 'transient',
      source: 'model',
      code: 'model_service_error',
      retryable: true,
      rawMessage: '',
    };
  }

  if (
    statusCode === ErrorStatusEnum.SCREENSHOT_RETRY_ERROR ||
    statusCode === ErrorStatusEnum.INVOKE_RETRY_ERROR
  ) {
    return {
      version: ERROR_TAXONOMY_VERSION,
      errorClass: 'transient',
      source: 'agent',
      code: 'retry_budget_exhausted',
      retryable: true,
      rawMessage: '',
    };
  }

  if (statusCode === ErrorStatusEnum.EXECUTE_RETRY_ERROR) {
    return {
      version: ERROR_TAXONOMY_VERSION,
      errorClass: 'execute',
      source: 'tool',
      code: 'execute_retry_error',
      retryable: false,
      rawMessage: '',
    };
  }

  if (statusCode === ErrorStatusEnum.ENVIRONMENT_ERROR) {
    return {
      version: ERROR_TAXONOMY_VERSION,
      errorClass: 'execute',
      source: 'runtime',
      code: 'environment_error',
      retryable: false,
      rawMessage: '',
    };
  }

  if (statusCode === ErrorStatusEnum.REACH_MAXLOOP_ERROR) {
    return {
      version: ERROR_TAXONOMY_VERSION,
      errorClass: 'execute',
      source: 'agent',
      code: 'max_loop_reached',
      retryable: false,
      rawMessage: '',
    };
  }

  return null;
};

const byMessage = (rawMessage: string): ErrorTaxonomyV1 => {
  const message = rawMessage.toLowerCase();

  if (
    /(auth|oauth|token|unauthorized|forbidden|api key|auth_state_invalid|\b401\b|\b403\b)/i.test(
      message,
    )
  ) {
    return {
      version: ERROR_TAXONOMY_VERSION,
      errorClass: 'auth',
      source: 'runtime',
      code: 'auth_error',
      retryable: false,
      rawMessage,
    };
  }

  if (
    /(timeout|timed out|deadline exceeded|abort|aborted|econnaborted)/i.test(
      message,
    )
  ) {
    return {
      version: ERROR_TAXONOMY_VERSION,
      errorClass: 'timeout',
      source: 'runtime',
      code: 'timeout_error',
      retryable: true,
      rawMessage,
    };
  }

  if (
    /(econnreset|eai_again|enotfound|\b429\b|\b503\b|network|rate limit|temporarily unavailable)/i.test(
      message,
    )
  ) {
    return {
      version: ERROR_TAXONOMY_VERSION,
      errorClass: 'transient',
      source: 'runtime',
      code: 'transient_error',
      retryable: true,
      rawMessage,
    };
  }

  if (
    /(validation|invalid args|zod|action_type_missing|start_box_required|parse|malformed|action_type_unsupported)/i.test(
      message,
    )
  ) {
    return {
      version: ERROR_TAXONOMY_VERSION,
      errorClass: 'format',
      source: 'runtime',
      code: 'format_error',
      retryable: false,
      rawMessage,
    };
  }

  if (
    /(invoke_gate_deny|tool_first_route_unhandled|non_zero_exit|spawn_error|unsupported_target|unsupported_platform)/i.test(
      message,
    )
  ) {
    return {
      version: ERROR_TAXONOMY_VERSION,
      errorClass: 'execute',
      source: 'tool',
      code: 'execute_error',
      retryable: false,
      rawMessage,
    };
  }

  return {
    version: ERROR_TAXONOMY_VERSION,
    errorClass: 'unknown',
    source: 'unknown',
    code: 'unknown_error',
    retryable: false,
    rawMessage,
  };
};

export const classifyRuntimeErrorV1 = (error: unknown): ErrorTaxonomyV1 => {
  const rawMessage = toRawMessage(error);
  const statusCode = toStatusCode(error);
  const statusMapping = byStatusCode(statusCode);

  if (statusMapping) {
    return {
      ...statusMapping,
      rawMessage,
    };
  }

  return byMessage(rawMessage);
};
