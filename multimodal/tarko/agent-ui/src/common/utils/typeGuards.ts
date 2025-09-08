import { ChatCompletionContentPart } from '../types';

/**
 * Type guard: Check if content is a string
 */
export function isStringContent(content: string | ChatCompletionContentPart[]): content is string {
  return typeof content === 'string';
}

/**
 * Type guard: Check if content is a multimodal content array
 */
export function isMultimodalContent(
  content: string | ChatCompletionContentPart[],
): content is ChatCompletionContentPart[] {
  return Array.isArray(content);
}

/**
 * Type guard: Check if object has a specific property
 */
export function hasProperty<T extends object, K extends string>(
  obj: T,
  prop: K,
): obj is T & Record<K, unknown> {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}
