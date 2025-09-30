/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ConsoleLogger, LogLevel } from '@agent-infra/logger';
import { AIOHybridOperator } from './AIOHybridOperator';
import { AIOGameOptions } from './types';
import { SupportedActionType } from '@gui-agent/shared/types';

const defaultLogger = new ConsoleLogger(undefined, LogLevel.DEBUG);

export class AIOGameOperator extends AIOHybridOperator {
  readonly name = 'aio-game';
  readonly description = 'Operator for game environment';
  private targetUrl?: string;

  constructor(options: AIOGameOptions, logger: ConsoleLogger = defaultLogger) {
    const operatorLogger = logger.spawn('[Game]');
    super(options, operatorLogger);
    this.targetUrl = options.targetUrl;
  }

  protected supportedActions(): Array<SupportedActionType> {
    return [
      'call_user',
      'finished',
      'wait',
      'mouse_down',
      'mouse_up',
      'mouse_move',
      'click',
      'double_click',
      'right_click',
      'middle_click',
      'drag',
      'type',
      'hotkey',
      'press',
      'release',
      'scroll',
    ];
  }

  protected async initialize(): Promise<void> {
    await super.initialize();
    if (!this.targetUrl) {
      this.logger.warn('targetUrl is null');
      return;
    }
    await this.aioBrowser?.handleNavigate({
      url: this.targetUrl,
    });
    this.logger.info(`initialize: goto ${this.targetUrl} successfully`);
  }
}
