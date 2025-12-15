/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Type definitions for PDK (PNPM Dev Kit)
 * 
 * CLI, Node.js API, and Config API are completely isomorphic:
 * - CLI: pdk release --changelog --use-ai --dry-run
 * - Node.js: release({ changelog: true, useAi: true, dryRun: true })
 * - Config: { changelog: true, useAi: true, dryRun: true }
 */

// =============================================================================
// WORKSPACE AND PACKAGE MANAGEMENT TYPES
// =============================================================================

/**
 * Minimal package.json interface with only essential fields for PDK
 */
export interface PackageJson {
  /**
   * Package name for identification and publishing
   */
  name: string;
  /**
   * Current semantic version
   */
  version: string;
  /**
   * Whether this package should be excluded from publishing
   */
  private?: boolean;
  /**
   * Workspace patterns for monorepo coordination
   */
  workspaces?: string[];
  /**
   * Runtime dependencies that affect publishing order
   */
  dependencies?: Record<string, string>;
  /**
   * Development dependencies (not published)
   */
  devDependencies?: Record<string, string>;
  /**
   * Peer dependencies that require version coordination
   */
  peerDependencies?: Record<string, string>;
  /**
   * Build and development scripts
   */
  scripts?: Record<string, string>;
  /**
   * Allow other package.json extensions without type conflicts
   */
  [key: string]: unknown;
}

/**
 * Package information within a workspace
 */
export interface WorkspacePackage {
  /**
   * Package identifier for publishing and dependency resolution
   */
  name: string;
  /**
   * Current version before release
   */
  version: string;
  /**
   * File system location relative to workspace root
   */
  dir: string;
  /**
   * Parsed package.json content for dependency analysis
   */
  packageJson: PackageJson;
  /**
   * Whether this package should be skipped during publishing
   */
  isPrivate: boolean;
}

/**
 * Workspace configuration and metadata
 */
export interface WorkspaceConfig {
  /**
   * Absolute path to workspace root directory
   */
  rootPath: string;
  /**
   * Root package.json containing workspace configuration
   */
  rootPackageJson: PackageJson;
  /**
   * Glob patterns used to discover workspace packages
   */
  patterns: string[];
}

/**
 * Package with remote version information from registry
 */
export interface PackageWithRemoteInfo extends WorkspacePackage {
  /**
   * Version currently published to the remote registry
   */
  remoteVersion: string;
}

// =============================================================================
// OPTION GROUP TYPES (COMPOSABLE BUILDING BLOCKS)
// =============================================================================

/**
 * Core operational options used across all commands
 */
export interface CoreOptions {
  /**
   * Working directory for all operations (default: process.cwd())
   */
  cwd?: string;
  /**
   * Preview mode without making actual changes (default: false)
   */
  dryRun?: boolean;
  /**
   * Publish packages sequentially instead of in parallel (default: false)
   */
  runInBand?: boolean;
  /**
   * Skip npm scripts during operations (default: false)
   */
  ignoreScripts?: boolean;
  /**
   * Prefix for git tags like 'v' for v1.0.0 (default: 'v')
   */
  tagPrefix?: string;
}

/**
 * AI-powered changelog generation options
 */
export interface AIOptions {
  /**
   * Enable AI-powered changelog generation (default: false)
   */
  useAi?: boolean;
  /**
   * LLM model for AI changelog generation (default: 'gpt-4o')
   */
  model?: string;
  /**
   * API key for LLM service (can be set via environment)
   */
  apiKey?: string;
  /**
   * Custom base URL for LLM API (for custom endpoints)
   */
  baseURL?: string;
  /**
   * LLM provider (default: 'openai')
   */
  provider?: string;
}

/**
 * Changelog filtering and formatting options
 */
export interface ChangelogFilterOptions {
  /**
   * Scopes to include in changelog (empty array = include all)
   */
  filterScopes?: string[];
  /**
   * Commit types to include in changelog (default: ['feat', 'fix'])
   */
  filterTypes?: string[];
}

/**
 * Development mode specific options
 */
export interface DevSpecificOptions {
  /**
   * Packages to exclude from development startup
   */
  exclude?: string[];
  /**
   * Packages to start by default (empty = start all packages)
   */
  packages?: string[];
}

/**
 * Release workflow specific options
 */
export interface ReleaseSpecificOptions {
  /**
   * Generate changelog during release (default: true)
   */
  changelog?: boolean;
  /**
   * Execute build script before publishing (false = skip, string = custom script)
   */
  build?: boolean | string;
  /**
   * Automatically push git tags to remote (default: false)
   */
  pushTag?: boolean;
  /**
   * Generate canary version without prompts (default: false)
   */
  canary?: boolean;
  /**
   * Create GitHub release after successful release (default: false)
   */
  createGithubRelease?: boolean;
  /**
   * Automatically create release branch before release (default: false)
   */
  autoCreateReleaseBranch?: boolean;
  /**
   * Directly specify release version (skips interactive selection)
   */
  releaseVersion?: string;
  /**
   * Directly specify release tag (skips interactive selection)
   */
  releaseTag?: string;
  /**
   * Skip confirmation prompts during release
   */
  skipConfirm?: boolean;
}

/**
 * Patch operation specific options
 */
export interface PatchSpecificOptions {
  /**
   * Specific version to patch (reads from package.json if not provided)
   */
  version?: string;
  /**
   * Distribution tag for patch release (e.g., latest, next, beta)
   */
  tag?: string;
}

/**
 * Changelog generation specific options
 */
export interface ChangelogSpecificOptions {
  /**
   * Target version for changelog generation
   */
  version?: string;
  /**
   * Format changelog with markdown enhancements (default: false)
   */
  beautify?: boolean;
  /**
   * Create git commit for generated changelog (default: false)
   */
  commit?: boolean;
  /**
   * Push changelog commit to remote (default: false)
   */
  gitPush?: boolean;
  /**
   * Include author information in changelog (default: false)
   */
  attachAuthor?: boolean;
  /**
   * Author name format: 'name' or 'email' (default: 'name')
   */
  authorNameType?: 'name' | 'email';
}

/**
 * GitHub release specific options
 */
export interface GitHubReleaseSpecificOptions {
  /**
   * Version for GitHub release (reads from package.json if not provided)
   */
  version?: string;
}

// =============================================================================
// COMMAND OPTION TYPES (COMPOSED FROM BUILDING BLOCKS)
// =============================================================================

/**
 * Common options available across all commands
 */
export interface CommonOptions extends 
  CoreOptions, 
  AIOptions, 
  ChangelogFilterOptions {}

/**
 * Development mode command options for selective package development
 */
export interface DevOptions extends CommonOptions, DevSpecificOptions {}

/**
 * Release command options for version management and publishing
 */
export interface ReleaseOptions extends CommonOptions, ReleaseSpecificOptions {}

/**
 * Patch command options for fixing failed releases
 */
export interface PatchOptions extends CommonOptions, PatchSpecificOptions {}

/**
 * Changelog generation command options
 */
export interface ChangelogOptions extends CommonOptions, ChangelogSpecificOptions {}

/**
 * GitHub release command options
 */
export interface GitHubReleaseOptions extends CommonOptions, GitHubReleaseSpecificOptions {}

// =============================================================================
// CHANGELOG AND GIT TYPES
// =============================================================================

/**
 * Commit author information extracted from git history
 */
export interface CommitAuthor {
  /**
   * Full author name from git config
   */
  name: string;
  /**
   * Author email address
   */
  email: string;
  /**
   * Email portion before @ for display purposes
   */
  emailName: string;
}

/**
 * Changelog section grouping commits by type
 */
export interface ChangelogSection {
  /**
   * Conventional commit type (feat, fix, perf, etc.)
   */
  type: string;
  /**
   * Human-readable section title
   */
  title: string;
  /**
   * Commits belonging to this section
   */
  commits: import('tiny-conventional-commits-parser').GitCommit[];
}

// =============================================================================
// CONFIGURATION TYPES (COMPREHENSIVE COMPOSITION)
// =============================================================================

/**
 * PDK Configuration interface
 * 
 * CLI, Node.js API, and Config API are completely isomorphic.
 * All three use identical option names and structures.
 * 
 * Config file preferences: project conventions, team settings, AI configuration
 * CLI preferences: environment-specific options, one-time operations, sensitive data
 */
export interface PDKConfig extends 
  CoreOptions, 
  AIOptions, 
  ChangelogFilterOptions,
  DevSpecificOptions,
  ReleaseSpecificOptions,
  PatchSpecificOptions,
  ChangelogSpecificOptions,
  GitHubReleaseSpecificOptions {}

/**
 * Loaded configuration with resolved defaults
 */
export interface LoadedConfig extends PDKConfig {
  /**
   * The final configuration with all defaults applied
   * 
   * This is what should be used for all actual operations. It contains
   * the complete configuration with all optional fields filled in with
   * their default values.
   */
  resolved: PDKConfig;
}