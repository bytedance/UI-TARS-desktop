import { ChatCompletionContentPart } from '../types';

/**
 * 类型守卫：检查内容是否为字符串
 */
export function isStringContent(content: string | ChatCompletionContentPart[]): content is string {
  return typeof content === 'string';
}

/**
 * 类型守卫：检查内容是否为多模态内容数组
 */
export function isMultimodalContent(
  content: string | ChatCompletionContentPart[],
): content is ChatCompletionContentPart[] {
  return Array.isArray(content);
}

/**
 * 类型守卫：检查对象是否有特定属性
 */
export function hasProperty<T extends object, K extends string>(
  obj: T,
  prop: K,
): obj is T & Record<K, unknown> {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}
