import { describe, expect, it } from 'vitest';
import {
  normalizeToolCallArgumentsString,
  parseToolCallArguments,
} from '../../src/utils/parse-tool-call-arguments';

describe('parseToolCallArguments', () => {
  it('returns empty object for missing or blank arguments', () => {
    expect(parseToolCallArguments(undefined)).toEqual({});
    expect(parseToolCallArguments(null)).toEqual({});
    expect(parseToolCallArguments('')).toEqual({});
    expect(parseToolCallArguments('   ')).toEqual({});
  });

  it('parses valid JSON strings', () => {
    expect(parseToolCallArguments('{"index":1}')).toEqual({ index: 1 });
  });

  it('handles object arguments from deserialized snapshots', () => {
    expect(parseToolCallArguments({})).toEqual({});
    expect(parseToolCallArguments({ index: 2 })).toEqual({ index: 2 });
  });

  it('repairs incomplete JSON from streaming tool calls', () => {
    expect(parseToolCallArguments('{')).toEqual({});
  });

  it('normalizes invalid object string coercion cases to empty object', () => {
    expect(normalizeToolCallArgumentsString('[object Object]')).toBe('{}');
  });
});
