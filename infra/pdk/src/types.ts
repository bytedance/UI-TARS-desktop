/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Type definitions for PDK (Package Development Kit)
 * 
 * USAGE PATTERNS:
 * 
 * CLI:          ptk release --changelog --use-ai --dry-run
 * Node.js API:  release({ changelog: true, useAi: true, dryRun: true })
 * Config API:  { changelog: true, useAi: true, dryRun: true }
 * 
 * All three use identical option names and structures.
 */

// =============================================================================
// WORKSPACE AND PACKAGE MANAGEMENT TYPES
// =============================================================================

/**
 * Minimal package.json interface containing only the fields PDK needs
 * 
 * This interface is intentionally minimal to avoid type conflicts with
 * the many possible extensions of package.json. We only care about the
 * fields that are essential for workspace management and publishing.
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
 * Represents a package within a workspace context
 * 
 * This type encapsulates everything PDK needs to know about an individual
 * package during release operations, including its location and metadata.
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
 * 
 * Provides context for the entire monorepo, including patterns for
 * package discovery and root package information for coordination.
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
 * 
 * Used during publishing to determine if a package version already exists
 * in the remote registry, preventing duplicate publishes.
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
 * Common options available across ALL commands
 * 
 * This interface combines all option groups that are commonly used
 * across multiple commands, providing a comprehensive base for all operations.
 */
export interface CommonOptions extends 
  CoreOptions, 
  AIOptions, 
  ChangelogFilterOptions {}

/**
 * Development mode command options
 * 
 * The dev command focuses on selective package development in monorepos.
 * It's designed for rapid iteration on specific packages while maintaining
 * the full workspace context.
 * 
 * PRIMARY USE CASE: Start development servers for specific packages
 * while excluding others to save resources and focus development effort.
 */
export interface DevOptions extends CommonOptions, DevSpecificOptions {}

/**
 * Release command options for version management and publishing
 * 
 * The release command orchestrates the complete release workflow:
 * version updates, changelog generation, git operations, and package publishing.
 * It's the most complex command, handling coordination across the entire workspace.
 * 
 * DESIGN PHILOSOPHY: Release is atomic and comprehensive. Either the entire
 * release succeeds or it fails cleanly with rollback capabilities.
 */
export interface ReleaseOptions extends CommonOptions, ReleaseSpecificOptions {}

/**
 * Patch command options for fixing failed releases
 * 
 * The patch command is specifically designed to recover from release failures.
 * It provides targeted fixes without requiring a full re-release.
 * 
 * PRIMARY USE CASE: Fix specific packages that failed to publish during
 * a release without re-running the entire release process.
 */
export interface PatchOptions extends CommonOptions, PatchSpecificOptions {}

/**
 * Changelog generation command options
 * 
 * The changelog command focuses specifically on generating and managing
 * changelog content. It can be used independently or as part of the release process.
 * 
 * DESIGN NOTE: Changelog generation is deliberately decoupled from release
 * to allow flexible usage patterns. Users can generate changelogs for any
 * version range, not just releases.
 */
export interface ChangelogOptions extends CommonOptions, ChangelogSpecificOptions {}

/**
 * GitHub release command options
 * 
 * The github-release command creates GitHub releases from existing changelogs.
 * It's designed to integrate with the release workflow but can be used independently.
 * 
 * PRIMARY USE CASE: Create GitHub releases with proper changelog content
 * and version tagging after a successful release process.
 */
export interface GitHubReleaseOptions extends CommonOptions, GitHubReleaseSpecificOptions {}

// =============================================================================
// CHANGELOG AND GIT TYPES
// =============================================================================

/**
 * Commit author information extracted from git history
 * 
 * Used for attributing changes in changelogs and release notes.
 * The emailName field provides a display-friendly version of the email.
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
 * 
 * Represents a logical section in the generated changelog,
 * such as "Features", "Bug Fixes", or "Performance Improvements".
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
 * PDK Configuration interface - THE SINGLE SOURCE OF TRUTH
 * 
 * CRITICAL DESIGN PRINCIPLE: This interface defines the EXACT structure
 * used by ALL APIs (CLI, Node.js, Config). There is NO transformation,
 * mapping, or conversion between different usage patterns.
 * 
 * ISOMORPHIC GUARANTEE:
 * - CLI: ptk release --changelog --use-ai --dry-run
 * - Node.js: release({ changelog: true, useAi: true, dryRun: true })
 * - Config: { changelog: true, useAi: true, dryRun: true })
 * 
 * All three use IDENTICAL option names and structures. No more
 * tagPrefix vs common.tagPrefix confusion.
 * 
 * CONFIGURATION PHILOSOPHY:
 * 
 * 1. COMPOSITION OVER REDUNDANCY: Configuration is composed from
 *    focused, reusable option groups rather than duplicating fields.
 *    This eliminates redundancy while maintaining the flat structure.
 * 
 * 2. FLAT OVER NESTED: Despite internal composition, the resulting
 *    configuration remains flat for natural reading and writing.
 * 
 * 3. DOCUMENTED SCOPE: Options are documented by their primary command
 *    usage but can be used anywhere they make sense. The type system
 *    provides guidance without artificial restrictions.
 * 
 * 4. SENSIBLE DEFAULTS: All options have reasonable defaults, making
 *    the kit work out-of-the-box while remaining highly configurable.
 * 
 * 5. PROGRESSIVE DISCOVERY: Common options are always available,
 *    command-specific options appear where relevant. Users can start
 *    simple and gradually discover advanced options.
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
 * 
 * This type represents the result of loading and processing a PDK configuration.
 * The 'resolved' field contains the final configuration with all defaults applied,
 * while the base fields preserve the original user configuration for reference.
 * 
 * DESIGN NOTE: The separation between original config and resolved config allows
 * for debugging and introspection while providing a clean, fully-populated
 * configuration object for actual use.
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