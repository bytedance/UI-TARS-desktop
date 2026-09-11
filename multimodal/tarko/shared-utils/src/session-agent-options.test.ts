/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  ALLOWED_SESSION_AGENT_OPTION_KEYS,
  filterDeclaredRuntimeSettings,
  sanitizeSessionAgentOptions,
} from './session-agent-options';

describe('sanitizeSessionAgentOptions', () => {
  it('keeps allowlisted keys', () => {
    const agentMode = { id: 'game', link: 'https://example.com/g', browserMode: 'hybrid' };

    expect(sanitizeSessionAgentOptions({ agentMode })).toEqual({
      value: { agentMode },
      rejectedKeys: [],
    });
  });

  it('rejects mcpServers, which would let a request start a local process', () => {
    const result = sanitizeSessionAgentOptions({
      mcpServers: { evil: { command: 'sh', args: ['-c', 'id'] } },
    });

    expect(result.value).toBeUndefined();
    expect(result.rejectedKeys).toEqual(['mcpServers']);
  });

  it('rejects aioSandbox, which would downgrade or redirect sandboxed execution', () => {
    const result = sanitizeSessionAgentOptions({ aioSandbox: 'http://attacker.example' });

    expect(result.value).toBeUndefined();
    expect(result.rejectedKeys).toEqual(['aioSandbox']);
  });

  it('rejects credential and endpoint overrides', () => {
    const result = sanitizeSessionAgentOptions({
      model: { baseURL: 'http://attacker.example', apiKey: 'stolen' },
      agio: { provider: 'http://attacker.example' },
      workspace: '/etc',
    });

    expect(result.value).toBeUndefined();
    expect(result.rejectedKeys).toEqual(['model', 'agio', 'workspace']);
  });

  it('reports rejected keys alongside accepted ones', () => {
    const result = sanitizeSessionAgentOptions({
      agentMode: { id: 'gui' },
      mcpServers: {},
    });

    expect(result.value).toEqual({ agentMode: { id: 'gui' } });
    expect(result.rejectedKeys).toEqual(['mcpServers']);
  });

  it('rejects prototype-reaching keys', () => {
    const payload = JSON.parse('{"__proto__": {"polluted": true}, "constructor": {}}');
    const result = sanitizeSessionAgentOptions(payload);

    expect(result.value).toBeUndefined();
    expect(result.rejectedKeys).toContain('__proto__');
    expect(result.rejectedKeys).toContain('constructor');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('rejects an allowlisted key carrying a non-JSON value', () => {
    const result = sanitizeSessionAgentOptions({ agentMode: () => 'nope' });

    expect(result.value).toBeUndefined();
    expect(result.rejectedKeys).toEqual(['agentMode']);
  });

  it('rejects an allowlisted key nesting a prototype-reaching key', () => {
    const payload = JSON.parse('{"agentMode": {"__proto__": {"polluted": true}}}');

    expect(sanitizeSessionAgentOptions(payload).rejectedKeys).toEqual(['agentMode']);
  });

  it('passes through absent input untouched', () => {
    expect(sanitizeSessionAgentOptions(undefined)).toEqual({ value: undefined, rejectedKeys: [] });
    expect(sanitizeSessionAgentOptions(null)).toEqual({ value: undefined, rejectedKeys: [] });
  });

  it('rejects non-object input', () => {
    expect(sanitizeSessionAgentOptions('agentMode').value).toBeUndefined();
    expect(sanitizeSessionAgentOptions([{ agentMode: {} }]).value).toBeUndefined();
  });

  it('does not allowlist anything that can start a process or carry a credential', () => {
    expect(ALLOWED_SESSION_AGENT_OPTION_KEYS).toEqual(['agentMode']);
  });
});

describe('filterDeclaredRuntimeSettings', () => {
  const schema = {
    properties: {
      agentMode: { type: 'string' as const },
      browserMode: { type: 'string' as const },
      maxSteps: { type: 'number' as const },
      thinking: { type: 'boolean' as const },
    },
  };

  it('keeps declared keys with matching types', () => {
    const input = { agentMode: 'gui', maxSteps: 5, thinking: true };

    expect(filterDeclaredRuntimeSettings(input, schema)).toEqual({
      value: input,
      rejectedKeys: [],
    });
  });

  it('drops undeclared keys, so runtime settings cannot inject agent options', () => {
    const result = filterDeclaredRuntimeSettings(
      {
        agentMode: 'gui',
        mcpServers: { evil: { command: 'sh' } },
        aioSandbox: 'http://attacker.example',
      },
      schema,
    );

    expect(result.value).toEqual({ agentMode: 'gui' });
    expect(result.rejectedKeys).toEqual(['mcpServers', 'aioSandbox']);
  });

  it('drops declared keys whose value does not match the declared type', () => {
    const result = filterDeclaredRuntimeSettings(
      { maxSteps: { toString: 'nope' }, thinking: 'yes' },
      schema,
    );

    expect(result.value).toEqual({});
    expect(result.rejectedKeys).toEqual(['maxSteps', 'thinking']);
  });

  it('drops everything when no schema is configured', () => {
    const result = filterDeclaredRuntimeSettings({ mcpServers: {}, agentMode: 'gui' });

    expect(result.value).toEqual({});
    expect(result.rejectedKeys).toEqual(['mcpServers', 'agentMode']);
  });

  it('returns an empty object for non-object input', () => {
    expect(filterDeclaredRuntimeSettings(undefined, schema).value).toEqual({});
    expect(filterDeclaredRuntimeSettings('nope', schema).value).toEqual({});
  });

  it('never returns a prototype-reaching key even if the schema declares one', () => {
    const payload = JSON.parse('{"__proto__": "polluted"}');
    const pollutedSchema = { properties: { __proto__: { type: 'string' as const } } };

    expect(filterDeclaredRuntimeSettings(payload, pollutedSchema).value).toEqual({});
  });
});
