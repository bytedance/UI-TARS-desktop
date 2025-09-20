/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { AdbOperator } from '@gui-agent/operator-adb';
import { NutJSOperator } from '@gui-agent/operator-nutjs';

const computerOperator = new NutJSOperator();
const androidOperator = new AdbOperator();

export { computerOperator, androidOperator };
