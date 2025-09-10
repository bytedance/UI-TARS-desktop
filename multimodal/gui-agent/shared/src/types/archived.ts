/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
export enum ErrorStatusEnum {
  /** 100000 */
  SCREENSHOT_RETRY_ERROR = -100000,
  /** 100001 */
  INVOKE_RETRY_ERROR = -100001,
  /** 100002 */
  EXECUTE_RETRY_ERROR = -100002,
  /** 100003 */
  MODEL_SERVICE_ERROR = -100003,
  /** 100004 */
  REACH_MAXLOOP_ERROR = -100004,
  /** 100005 */
  ENVIRONMENT_ERROR = -100005,
  /** 100099 */
  UNKNOWN_ERROR = -100099,
}

export class GUIAgentError extends Error {
  status: ErrorStatusEnum;
  message: string;
  stack?: string;

  constructor(status: ErrorStatusEnum, message: string, stack?: string) {
    super(message);
    this.status = status;
    this.message = message;
    this.stack = stack;
  }
}

export type Status = `${StatusEnum}`;
export enum StatusEnum {
  INIT = 'init',
  RUNNING = 'running',
  PAUSE = 'pause',
  END = 'end',
  CALL_USER = 'call_user',
  /**
   * @deprecated kept for backward compatibility
   */
  MAX_LOOP = 'max_loop',
  USER_STOPPED = 'user_stopped',
  ERROR = 'error',
}
export interface VlmResponse {
  generate_resp: {
    input: string;
    prediction: string;
    uid: string;
  }[];
}
