import { AgentServerVersionInfo, AgioProviderImpl } from '';

export type TConstructor<T, U extends unknown[] = unknown[]> = new (...args: U) => T;

export interface BootstrapCliOptions extends AgentServerVersionInfo {
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
