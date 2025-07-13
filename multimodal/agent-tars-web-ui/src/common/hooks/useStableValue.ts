import { useRef } from 'react';

/**
 * Hook to provide stable reference for frequently changing values
 * Helps prevent unnecessary re-renders when content updates rapidly
 *
 * @param value - The value that might change frequently
 * @param isEqual - Optional equality function to determine if values are equal
 * @returns Stable reference to the value
 */
export function useStableValue<T>(value: T, isEqual?: (a: T, b: T) => boolean): T {
  const valueRef = useRef<T>(value);
  const defaultIsEqual = (a: T, b: T) => a === b;
  const equalityCheck = isEqual || defaultIsEqual;

  if (!equalityCheck(valueRef.current, value)) {
    valueRef.current = value;
  }

  return valueRef.current;
}

/**
 * Hook specifically for code content to reduce re-renders during streaming
 * Uses content length and hash to determine if update is necessary
 */
export function useStableCodeContent(code: string): string {
  const contentRef = useRef({ value: code, hash: '' });

  // Simple hash function for content
  const simpleHash = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  };

  const currentHash = simpleHash(code);

  // Only update if content actually changed (not just reference)
  if (contentRef.current.hash !== currentHash) {
    contentRef.current = { value: code, hash: currentHash };
  }

  return contentRef.current.value;
}
