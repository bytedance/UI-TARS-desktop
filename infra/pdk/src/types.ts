/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Type definitions for PDK
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

// Common options shared across commands
export interface CommonOptions {
  cwd?: string;
  dryRun?: boolean;
  runInBand?: boolean;
  ignoreScripts?: boolean;
  tagPrefix?: string;
}

// AI-related options
export interface AIOptions {
  useAi?: boolean;
  model?: string;
  apiKey?: string;
  baseURL?: string;
  provider?: string;
}

// Filter options for changelog
export interface FilterOptions {
  filterScopes?: string[];
  filterTypes?: string[];
}

// Dev command options
export interface DevOptions extends CommonOptions {
  exclude?: string[];
  packages?: string[];
}

// Release command options
export interface ReleaseOptions extends CommonOptions, AIOptions, FilterOptions {
  changelog?: boolean;
  build?: boolean | string;
  pushTag?: boolean;
  canary?: boolean;
  createGithubRelease?: boolean;
  autoCreateReleaseBranch?: boolean;
}

// Patch command options
export interface PatchOptions extends CommonOptions {
  version?: string;
  tag?: string;
}

// Changelog command options
export interface ChangelogOptions extends CommonOptions, AIOptions, FilterOptions {
  version?: string;
  beautify?: boolean;
  commit?: boolean;
  gitPush?: boolean;
  attachAuthor?: boolean;
  authorNameType?: 'name' | 'email';
}

// Commit author information
export interface CommitAuthor {
  name: string;
  email: string;
  emailName: string;
}

export interface ChangelogSection {
  type: string;
  title: string;
  commits: import('tiny-conventional-commits-parser').GitCommit[];
}

// GitHub Release command options
export interface GitHubReleaseOptions extends CommonOptions {
  version?: string;
}

/**
 * PDK Configuration interface
 * Common options are at the top level, command-specific options are namespaced
 */
export interface PDKConfig {
  /**
   * Common options shared across all commands
   */
  common?: Partial<CommonOptions>;
  
  /**
   * AI-related options
   */
  ai?: Partial<AIOptions>;
  
  /**
   * Filter options for changelog generation
   */
  filter?: Partial<FilterOptions>;
  
  /**
   * Development configuration
   */
  dev?: Partial<Pick<DevOptions, 'exclude' | 'packages'>>;
  
  /**
   * Release configuration
   */
  release?: Partial<Pick<ReleaseOptions, 'changelog' | 'build' | 'pushTag' | 'canary' | 'createGithubRelease' | 'autoCreateReleaseBranch'>>;
  
  /**
   * Changelog configuration
   */
  changelog?: Partial<Pick<ChangelogOptions, 'beautify' | 'commit' | 'gitPush' | 'attachAuthor' | 'authorNameType'>>;
  
  /**
   * Patch configuration
   */
  patch?: Partial<PatchOptions>;
  
  /**
   * GitHub release configuration
   */
  githubRelease?: Partial<GitHubReleaseOptions>;
}

/**
 * Loaded configuration with resolved defaults
 */
export interface LoadedConfig extends PDKConfig {
  /**
   * The resolved common options
   */
  resolvedCommon: CommonOptions;
  
  /**
   * The resolved AI options
   */
  resolvedAi: AIOptions;
  
  /**
   * The resolved filter options
   */
  resolvedFilter: FilterOptions;
}
