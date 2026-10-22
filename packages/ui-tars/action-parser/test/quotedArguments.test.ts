/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it } from 'vitest';
import { parseActionVlm } from '../src/actionParser';

describe('quoted action arguments', () => {
  it.each(["'", '"'])(
    'preserves commas inside %s-quoted content and parses the next argument',
    (quote) => {
      const [action] = parseActionVlm(
        `type(content=${quote}Hello, world!${quote}, start_box=${quote}(100,200)${quote})`,
      );

      expect(action.action_type).toBe('type');
      expect(action.action_inputs).toEqual({
        content: 'Hello, world!',
        start_box: '[0.1,0.2,0.1,0.2]',
      });
    },
  );

  it('preserves apostrophes inside double-quoted content', () => {
    const [action] = parseActionVlm(`type(content="Don't stop, keep going")`);
    expect(action.action_inputs).toEqual({ content: "Don't stop, keep going" });
  });

  it('preserves double quotes inside single-quoted content', () => {
    const [action] = parseActionVlm(`type(content='Say "hello, world"')`);
    expect(action.action_inputs).toEqual({ content: 'Say "hello, world"' });
  });

  it.each([
    String.raw`type(content='It\'s fine, continue', start_box='(100,200)')`,
    String.raw`type(content="Say \"hello\", continue", start_box='(100,200)')`,
  ])('keeps escaped quotes from splitting an argument: %s', (input) => {
    const [action] = parseActionVlm(input);
    expect(action.action_inputs).toEqual({
      content: input.includes('It')
        ? String.raw`It\'s fine, continue`
        : String.raw`Say \"hello\", continue`,
      start_box: '[0.1,0.2,0.1,0.2]',
    });
  });

  it('preserves equals signs and raw newline escapes in quoted content', () => {
    const [action] = parseActionVlm(
      String.raw`type(content="a=b,c=d\nnext", start_box='(100,200)')`,
    );
    expect(action.action_inputs).toEqual({
      content: String.raw`a=b,c=d\nnext`,
      start_box: '[0.1,0.2,0.1,0.2]',
    });
  });
});
