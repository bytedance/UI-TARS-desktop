/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Mask sensitive information in objects
 * Primarily used to process configuration objects before logging to prevent sensitive information leakage
 */
export function maskSensitiveData<T extends Record<string, any>>(
  data: T,
  sensitiveKeys: string[] = ['apiKey', 'token', 'secret', 'password', 'key'],
): T {
  if (!data || typeof data !== 'object') {
    return data;
  }

  // Create a deep copy to avoid modifying the original object
  const maskedData = JSON.parse(JSON.stringify(data)) as T;

  // Process objects recursively
  const maskObject = (obj: Record<string, any>) => {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        // Check if it's a sensitive key
        if (
          sensitiveKeys.some((sk) =>
            key.toLowerCase().includes(sk.toLowerCase()),
          )
        ) {
          if (typeof obj[key] === 'string' && obj[key].length > 0) {
            // Keep the first 4 and last 4 characters, replace the middle with asterisks
            const value = obj[key];
            if (value.length <= 8) {
              obj[key] = '********';
            } else {
              obj[key] =
                `${value.substring(0, 4)}${'*'.repeat(value.length - 8)}${value.substring(value.length - 4)}`;
            }
          }
        } else if (obj[key] && typeof obj[key] === 'object') {
          // Process nested objects recursively
          maskObject(obj[key]);
        }
      }
    }
  };

  maskObject(maskedData);
  return maskedData;
}
