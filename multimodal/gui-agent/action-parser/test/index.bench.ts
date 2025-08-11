/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { bench, describe } from 'vitest';

describe('parser performance', () => {
  const testText = `
  Thought: This is a sample thought with multiple lines
  and some content that needs to be extracted.
  Action: click(start_box='(100,100)')
`;

  bench('regex method', () => {
    const thoughtMatch = testText.match(/Thought: ([\s\S]+?)(?=\s*Action:|$)/);
    thoughtMatch ? thoughtMatch[1].trim() : '';
  });

  bench('split method', () => {
    const parts = testText.split('Thought: ');
    const thoughtPart = parts.length > 1 ? parts[1] : '';
    thoughtPart.split('Action:')[0].trim();
  });
});
