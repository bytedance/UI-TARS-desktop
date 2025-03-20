import { atom, getDefaultStore } from 'jotai';
import { isPathAllowed, getDefaultDirectory } from './fileSystemSettings';
import path from 'path-browserify';

interface PermissionRequest {
  path: string;
  promise: Promise<boolean>;
  resolve: (value: boolean) => void;
  reject: (reason: any) => void;
}

export const pendingPermissionRequestAtom = atom<PermissionRequest | null>(
  null,
);

/**
 * Normalize a file path based on permissions
 * @param filePath The file path to normalize
 * @returns Normalized path (absolute)
 */
export async function normalizePath(filePath: string): Promise<string> {
  // If it's already an absolute path, return it
  if (filePath.startsWith('/')) {
    return filePath;
  }

  // Otherwise, make it relative to the default directory
  const defaultDir = await getDefaultDirectory();
  if (!defaultDir) {
    throw new Error('No default directory configured');
  }

  return path.join(defaultDir, filePath);
}

/**
 * Check if a file operation is allowed and request permission if needed
 * @param filePath The file path to check
 * @returns Promise that resolves to true if allowed, false if denied
 */
export async function checkPathPermission(filePath: string): Promise<boolean> {
  // Normalize path first
  const normalizedPath = await normalizePath(filePath);

  // If path is allowed, return immediately
  if (await isPathAllowed(normalizedPath)) {
    return true;
  }

  // Get current atom value using getDefaultStore
  const store = getDefaultStore();
  const currentRequest = store.get(pendingPermissionRequestAtom);

  // If there's already a pending request for this path, return its promise
  if (currentRequest && currentRequest.path === normalizedPath) {
    return currentRequest.promise;
  }

  // Otherwise, create a new permission request
  let resolvePromise: (value: boolean) => void = () => {};
  let rejectPromise: (reason: any) => void = () => {};

  const promise = new Promise<boolean>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  // Update the atom with the new request using getDefaultStore
  store.set(pendingPermissionRequestAtom, {
    path: normalizedPath,
    promise,
    resolve: resolvePromise,
    reject: rejectPromise,
  });

  // Return the promise that will be resolved when user makes a decision
  return promise;
}

/**
 * Resolve a pending permission request
 * @param allowed Whether the permission was granted
 */
export function resolvePermission(allowed: boolean): void {
  const store = getDefaultStore();
  const currentRequest = store.get(pendingPermissionRequestAtom);

  if (currentRequest) {
    currentRequest.resolve(allowed);
    store.set(pendingPermissionRequestAtom, null);
  }
}
