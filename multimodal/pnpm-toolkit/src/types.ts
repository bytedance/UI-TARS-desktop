/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Type definitions for PTK
 */

// Package.json interface with minimal required fields
export interface PackageJson {
  name: string;
  version: string;
  private?: boolean;
  workspaces?: string[];
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  [key: string]: unknown;
}

// Represents a package in a workspace
export interface WorkspacePackage {
  name: string;
  version: string;
  dir: string;
  packageJson: PackageJson;
  isPrivate: boolean;
}

// Workspace configuration
export interface WorkspaceConfig {
  rootPath: string;
  rootPackageJson: PackageJson;
  patterns: string[];
}

// Package with remote version info
export interface PackageWithRemoteInfo extends WorkspacePackage {
  remoteVersion: string;
}

// Base command options
export interface CommandOptions {
  cwd?: string;
}

// Dev command options
export interface DevOptions extends CommandOptions {
  exclude?: string[];
}

// Release command options
export interface ReleaseOptions extends CommandOptions {
  dryRun?: boolean;
  changelog?: boolean;
  runInBand?: boolean;
  ignoreScripts?: boolean;
  build?: boolean | string;
  pushTag?: boolean;
  tagPrefix?: string;
  useAi?: boolean;
  model?: string;
  apiKey?: string;
  baseURL?: string;
  provider?: string;
}

// Patch command options
export interface PatchOptions extends CommandOptions {
  version?: string;
  tag?: string;
  runInBand?: boolean;
  ignoreScripts?: boolean;
}

// Changelog command options
export interface ChangelogOptions extends CommandOptions {
  version?: string;
  beautify?: boolean;
  commit?: boolean;
  gitPush?: boolean;
  attachAuthor?: boolean;
  authorNameType?: 'name' | 'email';
  useAi?: boolean;
  model?: string;
  apiKey?: string;
  baseURL?: string;
  tagPrefix?: string;
  dryRun?: boolean;
  provider?: string;
}

// Commit author information
export interface CommitAuthor {
  name: string;
  email: string;
  emailName: string;
}
