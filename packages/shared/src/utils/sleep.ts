/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
export default (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));
