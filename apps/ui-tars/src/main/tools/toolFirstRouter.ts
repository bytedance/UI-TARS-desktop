/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { randomUUID } from 'crypto';

import { type PredictionParsed, StatusEnum } from '@ui-tars/shared/types';

import { logger } from '@main/logger';
import { ReliabilityObservabilityService } from '@main/services/reliabilityObservability';

import { buildAppLaunchToolCall, runAppLaunchToolCall } from './appLaunchTool';
import {
  buildWindowFocusToolCall,
  runWindowFocusToolCall,
} from './windowFocusTool';
import {
  buildWindowWaitReadyToolCall,
  runWindowWaitReadyToolCall,
} from './windowWaitReadyTool';
import {
  resolveToolFirstTarget,
  type ToolFirstTarget,
} from './toolFirstTarget';

export type ToolFirstRouteResult = {
  handled: boolean;
  status: StatusEnum;
  toolName: 'app.launch' | 'window.focus' | 'window.wait_ready' | null;
  fallbackReason: string | null;
};

type ToolFirstRouteParams = {
  sessionId: string;
  intentId?: string;
  loopCount?: number;
  parsedPrediction: PredictionParsed;
};

type ToolFirstRouteOptions = {
  runAppLaunch?: typeof runAppLaunchToolCall;
  runWindowFocus?: typeof runWindowFocusToolCall;
  runWindowWaitReady?: typeof runWindowWaitReadyToolCall;
};

const APP_LAUNCH_ACTION_TYPES = new Set<string>(['app.launch', 'app_launch']);
const WINDOW_FOCUS_ACTION_TYPES = new Set<string>([
  'window.focus',
  'window_focus',
]);
const WINDOW_WAIT_READY_ACTION_TYPES = new Set<string>([
  'window.wait_ready',
  'window_wait_ready',
]);

const normalizeActionType = (actionType: string): string => {
  return actionType.trim().toLowerCase();
};

const resolveIntentId = (intentId?: string): string => {
  if (typeof intentId === 'string' && intentId.trim().length > 0) {
    return intentId;
  }

  return randomUUID();
};

const buildIdempotencyKey = (params: {
  sessionId: string;
  loopCount?: number;
  actionType: string;
  target: ToolFirstTarget;
}): string => {
  const normalizedSessionId = params.sessionId.trim() || 'unknown-session';
  const normalizedLoopCount =
    typeof params.loopCount === 'number' && Number.isFinite(params.loopCount)
      ? params.loopCount
      : 'no-loop';

  return [
    'tool-first',
    normalizedSessionId,
    normalizedLoopCount,
    params.actionType,
    params.target,
  ].join(':');
};

const fallback = (
  toolName: ToolFirstRouteResult['toolName'],
  fallbackReason: string,
): ToolFirstRouteResult => {
  return {
    handled: false,
    status: StatusEnum.RUNNING,
    toolName,
    fallbackReason,
  };
};

const observability = ReliabilityObservabilityService.getInstance();

export const executeToolFirstRoute = async (
  params: ToolFirstRouteParams,
  options?: ToolFirstRouteOptions,
): Promise<ToolFirstRouteResult> => {
  const actionType = normalizeActionType(
    params.parsedPrediction.action_type || '',
  );
  const target = resolveToolFirstTarget(
    params.parsedPrediction.action_inputs as Record<string, unknown>,
  );

  if (
    !APP_LAUNCH_ACTION_TYPES.has(actionType) &&
    !WINDOW_FOCUS_ACTION_TYPES.has(actionType) &&
    !WINDOW_WAIT_READY_ACTION_TYPES.has(actionType)
  ) {
    return fallback(null, 'unsupported_action_type');
  }

  if (!target) {
    return fallback(null, 'target_unresolved');
  }

  const idempotencyKey = buildIdempotencyKey({
    sessionId: params.sessionId,
    loopCount: params.loopCount,
    actionType,
    target,
  });

  const intentId = resolveIntentId(params.intentId);

  try {
    if (APP_LAUNCH_ACTION_TYPES.has(actionType)) {
      const call = buildAppLaunchToolCall({
        intentId,
        targetApp: target,
        idempotencyKey,
      });
      observability.emitEvent({
        type: 'tool.call.started',
        sessionId: params.sessionId,
        intentId,
        callId: call.callId,
        toolName: call.toolName,
        toolVersion: call.toolVersion,
        status: 'started',
      });

      let result: Awaited<ReturnType<typeof runAppLaunchToolCall>>;
      try {
        result = await (options?.runAppLaunch ?? runAppLaunchToolCall)(call);
      } catch (error) {
        observability.emitEvent({
          type: 'tool.call.failed',
          sessionId: params.sessionId,
          intentId,
          callId: call.callId,
          toolName: call.toolName,
          toolVersion: call.toolVersion,
          status: 'error',
          errorClass: 'tool_exception',
        });
        logger.warn(
          '[tool-first-routing] app.launch crashed, fallback to visual',
          {
            error: error instanceof Error ? error.message : String(error),
          },
        );
        return fallback('app.launch', 'tool_exception');
      }

      if (result.status === 'ok') {
        observability.emitEvent({
          type: 'tool.call.finished',
          sessionId: params.sessionId,
          intentId,
          callId: result.callId,
          toolName: result.toolName,
          toolVersion: result.toolVersion,
          status: result.status,
          errorClass: result.errorClass,
        });
        return {
          handled: true,
          status: StatusEnum.RUNNING,
          toolName: 'app.launch',
          fallbackReason: null,
        };
      }

      observability.emitEvent({
        type: 'tool.call.failed',
        sessionId: params.sessionId,
        intentId,
        callId: result.callId,
        toolName: result.toolName,
        toolVersion: result.toolVersion,
        status: result.status,
        errorClass: result.errorClass,
      });
      logger.warn(
        '[tool-first-routing] app.launch failed, fallback to visual',
        {
          status: result.status,
          errorClass: result.errorClass,
        },
      );
      return fallback('app.launch', `tool_failed:${result.errorClass}`);
    }

    if (WINDOW_FOCUS_ACTION_TYPES.has(actionType)) {
      const call = buildWindowFocusToolCall({
        intentId,
        targetWindow: target,
        idempotencyKey,
      });
      observability.emitEvent({
        type: 'tool.call.started',
        sessionId: params.sessionId,
        intentId,
        callId: call.callId,
        toolName: call.toolName,
        toolVersion: call.toolVersion,
        status: 'started',
      });

      let result: Awaited<ReturnType<typeof runWindowFocusToolCall>>;
      try {
        result = await (options?.runWindowFocus ?? runWindowFocusToolCall)(
          call,
        );
      } catch (error) {
        observability.emitEvent({
          type: 'tool.call.failed',
          sessionId: params.sessionId,
          intentId,
          callId: call.callId,
          toolName: call.toolName,
          toolVersion: call.toolVersion,
          status: 'error',
          errorClass: 'tool_exception',
        });
        logger.warn(
          '[tool-first-routing] window.focus crashed, fallback to visual',
          {
            error: error instanceof Error ? error.message : String(error),
          },
        );
        return fallback('window.focus', 'tool_exception');
      }

      if (result.status === 'ok') {
        observability.emitEvent({
          type: 'tool.call.finished',
          sessionId: params.sessionId,
          intentId,
          callId: result.callId,
          toolName: result.toolName,
          toolVersion: result.toolVersion,
          status: result.status,
          errorClass: result.errorClass,
        });
        return {
          handled: true,
          status: StatusEnum.RUNNING,
          toolName: 'window.focus',
          fallbackReason: null,
        };
      }

      observability.emitEvent({
        type: 'tool.call.failed',
        sessionId: params.sessionId,
        intentId,
        callId: result.callId,
        toolName: result.toolName,
        toolVersion: result.toolVersion,
        status: result.status,
        errorClass: result.errorClass,
      });
      logger.warn(
        '[tool-first-routing] window.focus failed, fallback to visual',
        {
          status: result.status,
          errorClass: result.errorClass,
        },
      );
      return fallback('window.focus', `tool_failed:${result.errorClass}`);
    }

    const call = buildWindowWaitReadyToolCall({
      intentId,
      targetWindow: target,
      idempotencyKey,
    });
    observability.emitEvent({
      type: 'tool.call.started',
      sessionId: params.sessionId,
      intentId,
      callId: call.callId,
      toolName: call.toolName,
      toolVersion: call.toolVersion,
      status: 'started',
    });

    let result: Awaited<ReturnType<typeof runWindowWaitReadyToolCall>>;
    try {
      result = await (
        options?.runWindowWaitReady ?? runWindowWaitReadyToolCall
      )(call);
    } catch (error) {
      observability.emitEvent({
        type: 'tool.call.failed',
        sessionId: params.sessionId,
        intentId,
        callId: call.callId,
        toolName: call.toolName,
        toolVersion: call.toolVersion,
        status: 'error',
        errorClass: 'tool_exception',
      });
      logger.warn(
        '[tool-first-routing] window.wait_ready crashed, fallback to visual',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      return fallback('window.wait_ready', 'tool_exception');
    }

    if (result.status === 'ok') {
      observability.emitEvent({
        type: 'tool.call.finished',
        sessionId: params.sessionId,
        intentId,
        callId: result.callId,
        toolName: result.toolName,
        toolVersion: result.toolVersion,
        status: result.status,
        errorClass: result.errorClass,
      });
      return {
        handled: true,
        status: StatusEnum.RUNNING,
        toolName: 'window.wait_ready',
        fallbackReason: null,
      };
    }

    observability.emitEvent({
      type: 'tool.call.failed',
      sessionId: params.sessionId,
      intentId,
      callId: result.callId,
      toolName: result.toolName,
      toolVersion: result.toolVersion,
      status: result.status,
      errorClass: result.errorClass,
    });
    logger.warn(
      '[tool-first-routing] window.wait_ready failed, fallback to visual',
      {
        status: result.status,
        errorClass: result.errorClass,
      },
    );
    return fallback('window.wait_ready', `tool_failed:${result.errorClass}`);
  } catch (error) {
    logger.warn(
      '[tool-first-routing] tool execution crashed, fallback to visual',
      {
        actionType,
        target,
        error: error instanceof Error ? error.message : String(error),
      },
    );
    return fallback(null, 'tool_exception');
  }
};
