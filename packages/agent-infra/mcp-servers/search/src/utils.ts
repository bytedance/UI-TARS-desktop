/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * FIXME: move to shared.
 */
export function always_log(message: string, data?: any) {
  if (data) {
    console.error(message + ': ' + JSON.stringify(data));
  } else {
    console.error(message);
  }
}
