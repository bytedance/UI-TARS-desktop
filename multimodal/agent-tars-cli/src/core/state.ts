import { AgentTARSServerVersionInfo, AgioProviderImpl } from '@agent-tars/interface';

export type TConstructor<T, U extends unknown[] = unknown[]> = new (...args: U) => T;

export interface BootstrapCliOptions extends AgentTARSServerVersionInfo {
  agioProvider?: AgioProviderImpl;
  remoteConfig?: string;
  binName?: string;
}

const globalBootstrapCliOptions: BootstrapCliOptions = {} as BootstrapCliOptions;

export function setBootstrapCliOptions(options: BootstrapCliOptions) {
  Object.assign(globalBootstrapCliOptions, options);
}

export function getBootstrapCliOptions() {
  return globalBootstrapCliOptions;
}
