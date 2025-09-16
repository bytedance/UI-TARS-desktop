/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  Coordinates,
  SupportedActionType,
  ScreenshotOutput,
  ExecuteParams,
  ExecuteOutput,
  BaseAction,
} from '@gui-agent/shared/types';
import { Operator, ScreenContext } from '@gui-agent/shared/base';
import { ConsoleLogger, LogLevel } from '@agent-infra/logger';

const defaultLogger = new ConsoleLogger(undefined, LogLevel.DEBUG);

export class AdbOperator extends Operator {
  private logger: ConsoleLogger;
  private _screenContext: ScreenContext | null = null;

  constructor(logger: ConsoleLogger = defaultLogger) {
    super();
    this.logger = logger.spawn('[AdbOperator]');
  }

  protected async initialize(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  protected supportedActions(): Array<SupportedActionType> {
    throw new Error('Method not implemented.');
  }

  protected screenContext(): ScreenContext {
    throw new Error('Method not implemented.');
  }

  protected async screenshot(): Promise<ScreenshotOutput> {
    throw new Error('Method not implemented.');
  }

  protected async execute(params: ExecuteParams): Promise<ExecuteOutput> {
    const { actions } = params;
    for (const action of actions) {
      this.logger.info('execute action', action);
      await this.singleActionExecutor(action);
    }
    return {
      status: 'success',
    };
  }

  private async singleActionExecutor(action: BaseAction) {
    throw new Error('Method not implemented.');
  }

  private async calculateRealCoords(
    coords: Coordinates,
  ): Promise<{ realX: number; realY: number }> {
    throw new Error('Method not implemented.');
  }
}
