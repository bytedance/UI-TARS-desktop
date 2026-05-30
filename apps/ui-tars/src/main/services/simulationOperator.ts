/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  StatusEnum,
  type ExecuteOutput,
  type ExecuteParams,
} from '@ui-tars/sdk/core';

type ExecutableOperator = {
  execute(params: ExecuteParams): Promise<ExecuteOutput>;
};

type SimulatedActionHandler = (params: ExecuteParams) => Promise<void> | void;

const TERMINAL_ACTION_TYPES = new Set([
  'finished',
  'call_user',
  'error_env',
  'user_stop',
]);

function createSimulationOperator<T extends ExecutableOperator>(
  operator: T,
  onSimulatedAction: SimulatedActionHandler = () => undefined,
): T {
  operator.execute = async (params) => {
    await onSimulatedAction(params);

    const actionType = params.parsedPrediction.action_type;
    return {
      status: isSimulationTerminalAction(actionType)
        ? StatusEnum.END
        : StatusEnum.RUNNING,
      simulated: true,
      actionType,
      actionInputs: params.parsedPrediction.action_inputs,
    };
  };

  return operator;
}

function isSimulationTerminalAction(actionType: string): boolean {
  return TERMINAL_ACTION_TYPES.has(actionType);
}

export { createSimulationOperator, isSimulationTerminalAction };
