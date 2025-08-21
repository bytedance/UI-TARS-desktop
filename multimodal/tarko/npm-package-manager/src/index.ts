/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

export { TarkoNPMPackageManager } from './TarkoNPMPackageManager';
export type {
  PackageInfo,
  InstallOptions,
  AgentInputType,
} from './TarkoNPMPackageManager';
export { isNPMPackage, resolveAgentFromNPMInput } from './utils';
