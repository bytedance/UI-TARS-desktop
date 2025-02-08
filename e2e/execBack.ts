/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { execute } from '@main/agent/execute';
import { PredictionParsed } from '@ui-tars/shared/types';

const screenWidth = 1310;
const screenHeight = 813;
const predictions: PredictionParsed[] = [
  {
    action_type: 'click',
    action_inputs: {
      start_box: '[0.256,0.431,0.256,0.431]',
    },
    reflection: 'reflection',
    thought: 'thought',
  },
  {
    action_type: 'type',
    action_inputs: {
      content: 'www.doubao.com',
    },
    reflection: 'reflection',
    thought: 'thought',
  },
];

(async () => {
  for (const prediction of predictions) {
    await execute({
      prediction,
      screenWidth,
      screenHeight,
    });
  }
})();
