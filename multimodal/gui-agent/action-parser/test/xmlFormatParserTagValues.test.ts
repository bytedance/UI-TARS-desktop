/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { ConsoleLogger, LogLevel } from '@agent-infra/logger';

import { XMLFormatParser } from '../src/FomatParsers';

const logger = new ConsoleLogger('[XMLFormatParser]', LogLevel.DEBUG);

describe('XMLFormatParser numeric tag values', () => {
  it('keeps a numeric <answer> value as the string the action layer expects', () => {
    const result = new XMLFormatParser(logger).parse('<answer>42</answer>');

    expect(result).not.toBeNull();
    expect(result!.actions).toEqual([{ type: 'finished', inputs: { content: '42' } }]);
    expect(result!.rawActionStrings).toEqual([`finished(content='42')`]);
  });

  it('does not drop a zero answer', () => {
    const result = new XMLFormatParser(logger).parse('<answer>0</answer>');

    expect(result!.actions).toEqual([{ type: 'finished', inputs: { content: '0' } }]);
    expect(result!.rawActionStrings).toEqual([`finished(content='0')`]);
  });
});
