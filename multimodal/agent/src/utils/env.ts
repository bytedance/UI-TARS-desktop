/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
export const isTest = () => typeof process !== 'undefined' && process.env.TEST;
