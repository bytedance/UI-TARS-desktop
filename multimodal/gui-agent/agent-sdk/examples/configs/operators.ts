/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { AdbOperator } from '@gui-agent/operator-adb';
import { NutJSOperator } from '@gui-agent/operator-nutjs';
import { Operator, ScreenContext } from '@gui-agent/shared/base';
import {
  SupportedActionType,
  ScreenshotOutput,
  ExecuteParams,
  ExecuteOutput,
} from 'gui-agent/shared/src/types';

const computerOperator = new NutJSOperator();
const androidOperator = new AdbOperator();

class MockedBrowserOperator extends Operator {
  protected initialize(): Promise<void> {
    throw new Error('Method not implemented.');
  }
  protected supportedActions(): Array<SupportedActionType> {
    throw new Error('Method not implemented.');
  }
  protected screenContext(): ScreenContext {
    throw new Error('Method not implemented.');
  }
  protected screenshot(): Promise<ScreenshotOutput> {
    throw new Error('Method not implemented.');
  }
  protected execute(params: ExecuteParams): Promise<ExecuteOutput> {
    throw new Error('Method not implemented.');
  }
}

const browserOperator = new MockedBrowserOperator();

export { computerOperator, androidOperator, browserOperator };
