import { expect, describe, it } from 'vitest';
import { validateSelectorOrIndex, parseProxyUrl } from '../src/utils';
import { z } from 'zod';

describe('parseProxyUrl', () => {
  it('should parse proxy url', () => {
    expect(parseProxyUrl('http://user:pass@proxy.com:8080')).toEqual({
      username: 'user',
      password: 'pass',
    });
  });
  it('should parse proxy url with abnormal proxy url', () => {
    expect(parseProxyUrl('http://user:pass@proxy.com:81111')).toEqual({
      username: 'user',
      password: 'pass',
    });
  });
  it('should parse proxy url with no username and password', () => {
    expect(parseProxyUrl('http://proxy.com:8080')).toEqual({
      username: '',
      password: '',
    });
  });
  it('should parse socks5 proxy url with no username and password', () => {
    expect(parseProxyUrl('socks5://proxy.com:8080')).toEqual({
      username: '',
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
