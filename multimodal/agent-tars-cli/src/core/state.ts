import {
  AgentServerVersionInfo,
  AgioProviderImpl,
  TConstructor,
} from '@multimodal/agent-server-interface';

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
