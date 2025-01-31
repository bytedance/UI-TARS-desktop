/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
export const stringify = (obj: unknown) => {
  return JSON.stringify(
    obj,
    (_key, value) => {
      const MAX_LEN = 200;
      if (typeof value === 'string' && value.length > MAX_LEN) {
        return `${value.slice(0, MAX_LEN)}...`;
      }
      return value;
    },
    2,
  );
};
