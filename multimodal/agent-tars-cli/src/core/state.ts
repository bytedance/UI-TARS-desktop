import { AgioProviderImpl } from '@agent-tars/interface';

export type TConstructor<T, U extends unknown[] = unknown[]> = new (...args: U) => T;

export interface BootstrapCliOptions {
  agioProvider?: AgioProviderImpl;
  remoteConfig?: string;
  version?: string;
}

const globalBootstrapCliOptions: BootstrapCliOptions = {};

export function setBootstrapCliOptions(options: BootstrapCliOptions) {
  Object.assign(globalBootstrapCliOptions, options);
}

export function getBootstrapCliOptions() {
  return globalBootstrapCliOptions;
}