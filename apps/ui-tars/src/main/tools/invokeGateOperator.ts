/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  type ExecuteOutput,
  type ExecuteParams,
  Operator,
  type ScreenshotOutput,
} from '@ui-tars/sdk/core';

import { logger } from '@main/logger';
import type { ToolFirstFeatureFlags } from '@main/store/featureFlags';

import {
  type GateAuthState,
  buildActionIntentV1,
  evaluateInvokeGate,
} from './invokeGate';

type InvokeGateOperatorConfig = {
  innerOperator: Operator;
  featureFlags: ToolFirstFeatureFlags;
  sessionId: string;
  authState: GateAuthState;
  maxLoopCount: number;
};

export class InvokeGateOperator extends Operator {
  static MANUAL = {
    ACTION_SPACES: [] as string[],
  };

  private readonly innerOperator: Operator;
  private readonly featureFlags: ToolFirstFeatureFlags;
  private readonly sessionId: string;
  private readonly authState: GateAuthState;
  private remainingLoopBudget: number;

  constructor(config: InvokeGateOperatorConfig) {
    super();
    this.innerOperator = config.innerOperator;
    this.featureFlags = config.featureFlags;
    this.sessionId = config.sessionId;
    this.authState = config.authState;
    this.remainingLoopBudget = config.maxLoopCount;

    (this.constructor as typeof InvokeGateOperator).MANUAL = (
      this.innerOperator.constructor as typeof Operator
    ).MANUAL;
  }

  async screenshot(): Promise<ScreenshotOutput> {
    return this.innerOperator.screenshot();
  }

  async execute(params: ExecuteParams): Promise<ExecuteOutput> {
    const intent = buildActionIntentV1({
      sessionId: this.sessionId,
      parsedPrediction: params.parsedPrediction,
    });

    const gateDecision = evaluateInvokeGate(intent, {
      featureFlags: this.featureFlags,
      authState: this.authState,
      loopBudgetRemaining: this.remainingLoopBudget,
    });

    logger.info('[invoke-gate] decision', {
      actionType: intent.actionType,
      decision: gateDecision.decision,
      reasonCodes: gateDecision.reasonCodes,
      remainingLoopBudget: this.remainingLoopBudget,
    });

    if (gateDecision.decision === 'deny') {
      throw new Error(
        `[INVOKE_GATE_DENY] ${gateDecision.reasonCodes.join(',')}`,
      );
    }

    if (this.featureFlags.ffInvokeGate) {
      this.remainingLoopBudget = Math.max(0, this.remainingLoopBudget - 1);
    }

    return this.innerOperator.execute(params);
  }
}
