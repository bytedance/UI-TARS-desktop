import { expect, describe, it } from 'vitest';
import {
  validateSelectorOrIndex,
  parseProxyUrl,
  parseViewportSize,
  parserFactor,
} from '../../src/utils/utils';

describe('parseProxyUrl', () => {
  it('should parse proxy url', () => {
    // secretlint-disable-next-line
    expect(parseProxyUrl('http://user:pass@proxy.com:8080')).toEqual({
      username: 'user',
      // secretlint-disable-next-line
      password: 'pass',
    });
  });
  it('should parse proxy url with abnormal proxy url', () => {
    // secretlint-disable-next-line
    expect(parseProxyUrl('http://user:pass@proxy.com:81111')).toEqual({
      username: 'user',
      // secretlint-disable-next-line
      password: 'pass',
    });
  });
  it('should parse proxy url with no username and password', () => {
    expect(parseProxyUrl('http://proxy.com:8080')).toEqual({
      username: '',
      // secretlint-disable-next-line
      password: '',
    });
  });
  it('should parse socks5 proxy url with no username and password', () => {
    expect(parseProxyUrl('socks5://proxy.com:8080')).toEqual({
      username: '',
      // secretlint-disable-next-line
      password: '',
    });
  });

  it('should handle malformed URLs gracefully', () => {
    const result = parseProxyUrl('invalid-url');
    expect(result).toEqual({
      username: '',
      // secretlint-disable-next-line
      password: '',
    });
  });

  it('should handle empty proxy URL', () => {
    expect(parseProxyUrl('')).toEqual({
      username: '',
      // secretlint-disable-next-line
      password: '',
    });
  });
});

describe('validateSelectorOrIndex', () => {
  it('should create a schema that can be used to validate the input of a tool that has a selector or index', () => {
    expect(
      validateSelectorOrIndex({
        value: 'input_value',
      }),
    ).toBe(false);

    expect(
      validateSelectorOrIndex({
        selector: 'input',
        value: 'input_value',
      }),
    ).toBe(true);

    expect(
      validateSelectorOrIndex({
        index: 0,
        value: 'input_value',
      }),
    ).toBe(true);
  });
});

describe('parseViewportSize', () => {
  it('should parse valid viewport size string', () => {
    expect(parseViewportSize('800,600')).toEqual({
      width: 800,
      height: 600,
    });
  });

  it('should handle invalid viewport size string', () => {
    expect(parseViewportSize('invalid')).toEqual({
      width: undefined,
      height: undefined,
    });
  });

  it('should handle empty string', () => {
    expect(parseViewportSize('')).toBeUndefined();
  });

  it('should handle undefined input', () => {
    // @ts-ignore
    expect(parseViewportSize(undefined)).toBeUndefined();
  });

  it('should handle partial viewport size', () => {
    expect(parseViewportSize('800')).toEqual({
      width: 800,
      height: undefined,
    });
  });
});

describe('parserFactor', () => {
  it('should parse valid factor string', () => {
    expect(parserFactor('1.5,2.0')).toEqual([1.5, 2.0]);
  });

  it('should handle invalid factor string', () => {
    expect(parserFactor('invalid')).toEqual([undefined, undefined]);
  });

  it('should handle empty string', () => {
    expect(parserFactor('')).toBeUndefined();
  });

  it('should handle undefined input', () => {
    // @ts-ignore
    expect(parserFactor(undefined)).toBeUndefined();
  });

  it('should handle partial factor', () => {
    expect(parserFactor('1.5')).toEqual([1.5, 1.5]);
  });

  it('should handle 0 factor', () => {
    expect(parserFactor('0')).toEqual([0, 0]);
  });
});
