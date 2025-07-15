/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi } from 'vitest';
import type { DeepPartial } from './testUtils';

/**
 * Mock configuration options
 */
export interface MockOptions {
  name?: string;
  implementation?: (...args: any[]) => any;
  returnValue?: any;
  resolvedValue?: any;
  rejectedValue?: any;
}

/**
 * Creates a mock function with configured behavior
 */
export function createMockFn(options: MockOptions = {}) {
  const mock = vi.fn();

  if (options.implementation) {
    mock.mockImplementation(options.implementation);
  } else if (options.returnValue !== undefined) {
    mock.mockReturnValue(options.returnValue);
  } else if (options.resolvedValue !== undefined) {
    mock.mockResolvedValue(options.resolvedValue);
  } else if (options.rejectedValue !== undefined) {
    mock.mockRejectedValue(options.rejectedValue);
  }

  if (options.name) {
    Object.defineProperty(mock, 'name', { value: options.name });
  }

  return mock;
}

/**
 * Creates a mock object with specified properties and methods
 */
export function createMockObject<T extends object>(template: DeepPartial<T>): T {
  const result = {} as T;

  Object.entries(template).forEach(([key, value]) => {
    if (typeof value === 'function') {
      (result as any)[key] = createMockFn({ implementation: value });
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      (result as any)[key] = createMockObject(value);
    } else {
      (result as any)[key] = value;
    }
  });

  return result;
}

/**
 * Creates a mock object for a module
 * Use this with vi.mock in the test file
 */
export function createModuleMock<T extends object>(mockImplementation: DeepPartial<T>): T {
  return createMockObject(mockImplementation);
}
