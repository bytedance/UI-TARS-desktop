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
  isToolOnlyActionType,
} from './invokeGate';
import {
  executeToolFirstRoute,
  type ToolFirstRouteResult,
} from './toolFirstRouter';

type InvokeGateOperatorConfig = {
  innerOperator: Operator;
  featureFlags: ToolFirstFeatureFlags;
  sessionId: string;
  authState: GateAuthState;
  maxLoopCount: number;
  toolFirstRouter?: (params: {
    sessionId: string;
    loopCount?: number;
    parsedPrediction: ExecuteParams['parsedPrediction'];
  }) => Promise<ToolFirstRouteResult>;
};

export class InvokeGateOperator extends Operator {
  static MANUAL = {
    ACTION_SPACES: [] as string[],
  };

  private readonly innerOperator: Operator;
  private readonly featureFlags: ToolFirstFeatureFlags;
  private readonly sessionId: string;
  private readonly authState: GateAuthState;
  private readonly toolFirstRouter: NonNullable<
    InvokeGateOperatorConfig['toolFirstRouter']
  >;
  private remainingLoopBudget: number;
  private lastEvaluatedLoopCount: number | null = null;

  constructor(config: InvokeGateOperatorConfig) {
    super();
    this.innerOperator = config.innerOperator;
    this.featureFlags = config.featureFlags;
    this.sessionId = config.sessionId;
    this.authState = config.authState;
    this.toolFirstRouter = config.toolFirstRouter ?? executeToolFirstRoute;
    this.remainingLoopBudget = Number.isFinite(config.maxLoopCount)
      ? Math.max(0, config.maxLoopCount)
      : 0;

    (this.constructor as typeof InvokeGateOperator).MANUAL = (
      this.innerOperator.constructor as typeof Operator
    ).MANUAL;
  }

  async screenshot(): Promise<ScreenshotOutput> {
    return this.innerOperator.screenshot();
  }

  async execute(params: ExecuteParams): Promise<ExecuteOutput> {
    const loopCount = (params as ExecuteParams & { loopCount?: number })
      .loopCount;

    if (this.featureFlags.ffInvokeGate) {
      this.advanceLoopBudget(loopCount);
    }

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

    if (
      this.featureFlags.ffToolFirstRouting &&
      this.featureFlags.ffToolRegistry
    ) {
      const toolFirstResult = await this.toolFirstRouter({
        sessionId: this.sessionId,
        loopCount,
        parsedPrediction: params.parsedPrediction,
      });

      if (toolFirstResult.handled) {
        logger.info('[tool-first-routing] tool path handled action', {
          actionType: params.parsedPrediction.action_type,
          toolName: toolFirstResult.toolName,
          status: toolFirstResult.status,
        });
        return { status: toolFirstResult.status };
      }

      if (isToolOnlyActionType(params.parsedPrediction.action_type)) {
        throw new Error(
          `[TOOL_FIRST_ROUTE_UNHANDLED] ${toolFirstResult.fallbackReason || 'unknown'}`,
        );
      }

      logger.info('[tool-first-routing] fallback to visual operator', {
        actionType: params.parsedPrediction.action_type,
        fallbackReason: toolFirstResult.fallbackReason,
      });
    }

    return this.innerOperator.execute(params);
  }

  private advanceLoopBudget(loopCount?: number): void {
    if (typeof loopCount !== 'number') {
      this.remainingLoopBudget = Math.max(0, this.remainingLoopBudget - 1);
      return;
    }

    if (
      this.lastEvaluatedLoopCount !== null &&
      loopCount !== this.lastEvaluatedLoopCount
    ) {
      this.remainingLoopBudget = Math.max(0, this.remainingLoopBudget - 1);
    }

    this.lastEvaluatedLoopCount = loopCount;
  }
}
