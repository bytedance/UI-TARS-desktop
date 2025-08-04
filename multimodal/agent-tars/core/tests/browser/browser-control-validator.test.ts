import { describe, it, expect } from 'vitest';
import { validateBrowserControlMode } from '../../src/browser/browser-control-validator';
import { ConsoleLogger } from '@tarko/mcp-agent';

describe('Browser Control Validator', () => {
  const logger = new ConsoleLogger('test');

  it('should return requested mode when provider is volcengine', () => {
    const result = validateBrowserControlMode('volcengine', 'hybrid', logger);
    expect(result).toBe('hybrid');
  });

  it('should enforce browser-use-only mode for unsupported providers', () => {
    const result = validateBrowserControlMode('openai', 'hybrid', logger);
    expect(result).toBe('dom');
  });

  it('should enforce browser-use-only mode for undefined provider', () => {
    const result = validateBrowserControlMode(undefined, 'visual-grounding', logger);
    expect(result).toBe('dom');
  });

  it('should not change browser-use-only mode regardless of provider', () => {
    const result = validateBrowserControlMode('unknown', 'dom', logger);
    expect(result).toBe('dom');
  });
});
