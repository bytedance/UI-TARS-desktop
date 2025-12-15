/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * CLI entry point for PDK
 */
import { cac } from 'cac';
import { dev, release, patch, changelog, githubRelease, nextVersion } from './commands';
import { logger } from './utils/logger';
import { loadPDKConfig, mergeOptions } from './utils/config';

/**
 * Wraps a command execution with error handling and config loading
 */
// eslint-disable-next-line @typescript-eslint/ban-types
async function wrapCommand(
  // eslint-disable-next-line @typescript-eslint/ban-types
  command: Function,
  cliOptions: Record<string, unknown>,
) {
  cliOptions.cwd = cliOptions.cwd || process.cwd();

  try {
    // Load configuration
    const config = await loadPDKConfig({ cwd: cliOptions.cwd as string });

    // Merge CLI options with configuration
    const mergedOptions = mergeOptions(cliOptions, config);

    await command(mergedOptions);
  } catch (err) {
    console.log();
    process.exitCode = 1;
    logger.error((err as Error).message);
    console.log();
  }
}

/**
 * Bootstrap the CLI
 */
export function bootstrapCli() {
  const cli = cac('pdk');
  const pkg = require('../package.json');

  // Global options
  cli.option('--cwd <cwd>', 'Current working directory');

  // Dev command
  cli
    .command('d', 'Quickly launch on-demand development build for monorepo')
    .alias('dev')
    .option(
      '--exclude <packages>',
      'Comma-separated list of packages to exclude',
    )
    .option(
      '--packages, --pkg <packages>',
      'Comma-separated list of packages to start by default',
    )
    .action((opts) => {
      if (opts.packages && typeof opts.packages === 'string') {
        opts.packages = opts.packages.split(',').map((p: string) => p.trim());
      } else {
        opts.packages = [];
      }

      if (opts.exclude && typeof opts.exclude === 'string') {
        opts.exclude = opts.exclude.split(',').map((p: string) => p.trim());
      } else {
        opts.exclude = [];
      }

      return wrapCommand(dev, opts);
    });

  // Release command
  cli
    .command('r', 'Release your monorepo')
    .option('--changelog', 'Whether to generate changelog')
    .option('--push-tag', 'Automatically push git tag to remote')
    .option('--build [build]', 'Execute custom build script before release')
    .option('--dry-run', 'Preview execution without making changes')
    .option('--run-in-band', 'Whether to publish package in series')
    .option(
      '--ignore-scripts',
      'Ignore npm scripts during release and patch process',
    )
    .option('--tag-prefix <prefix>', 'Prefix for git tags')
    .option(
      '--canary',
      'Skip version/tag selection and auto-generate canary version',
    )
    .option('--use-ai', 'Use AI to generate changelog')
    .option('--provider <provider>', 'LLM provider to use (default: openai)')
    .option('--model <model>', 'LLM model to use (default: gpt-4o)')
    .option('--apiKey, --api-key <apiKey>', 'Custom API key for LLM')
    .option('--baseURL, --base-url <baseURL>', 'Custom base URL for LLM')
    .option(
      '--filter-scopes <scopes>',
      'Comma-separated list of scopes to include in changelog (empty for all)',
    )
    .option(
      '--filter-types <types>',
      'Comma-separated list of commit types to include in changelog',
    )
    .option(
      '--create-github-release',
      'Create GitHub release after successful release',
    )
    .option(
      '--auto-create-release-branch',
      'Automatically create release branch before release',
    )
    .option(
      '--release-version <version>',
      'Directly specify release version (skips interactive selection)',
    )
    .option(
      '--release-tag <tag>',
      'Directly specify release tag (skips interactive selection)',
    )
    .option(
      '--skip-confirm',
      'Skip confirmation prompts during release',
    )
    .alias('release')
    .action((opts) => {
      // Process filter options
      if (opts.filterScopes) {
        opts.filterScopes = opts.filterScopes
          .split(',')
          .map((s: string) => s.trim());
      }
      if (opts.filterTypes && opts.filterTypes.trim()) {
        opts.filterTypes = opts.filterTypes
          .split(',')
          .map((s: string) => s.trim());
      } else {
        opts.filterTypes = [];
      }
      return wrapCommand(release, opts);
    });

  // Patch command
  cli
    .command('p', 'Patch the failure of release process')
    .option(
      '--patch-version <version>',
      'Version (e.g. 1.0.0, 2.0.0-alpha.9)',
      {
        // There is no default value here, because the default is read from package.json
      },
    )
    .option('--tag <tag>', 'Tag (e.g. latest, next, beta)')
    .option('--run-in-band', 'Whether to publish package in series')
    .option('--ignore-scripts', 'Ignore npm scripts under patch process')
    .alias('patch')
    .action((opts) => {
      // Map patch-version to version for compatibility
      if (opts.patchVersion) {
        opts.version = opts.patchVersion;
      }
      return wrapCommand(patch, opts);
    });

  // Changelog command
  cli
    .command('changelog', 'Create changelog')
    .option('--dry-run', 'Preview execution without making changes')
    .option('--changelog-version <version>', 'Version', {
      // There is no default value here, because the default is read from package.json
    })
    .option('--tag-prefix <prefix>', 'Prefix for git tags')
    .option('--beautify', 'Beautify changelog or not')
    .option('--commit', 'Create git commit or not')
    .option('--git-push', 'Execute git push or not')
    .option('--attach-author', 'Add author or not')
    .option('--author-name-type <type>', 'Type of author name: name or email')
    .option('--use-ai', 'Use AI to generate changelog')
    .option('--provider <provider>', 'LLM provider to use (default: openai)')
    .option('--model <model>', 'LLM model to use (default: gpt-4o)')
    .option('--apiKey, --api-key <apiKey>', 'Custom API key for LLM')
    .option('--baseURL, --base-url <baseURL>', 'Custom base URL for LLM')
    .option(
      '--filter-scopes <scopes>',
      'Comma-separated list of scopes to include in changelog (empty for all)',
    )
    .option(
      '--filter-types <types>',
      'Comma-separated list of commit types to include in changelog',
    )
    .action((opts) => {
      // Map changelog-version to version for compatibility
      if (opts.changelogVersion) {
        opts.version = opts.changelogVersion;
      }
      // Process filter options
      if (opts.filterScopes) {
        opts.filterScopes = opts.filterScopes
          .split(',')
          .map((s: string) => s.trim());
      }
      if (opts.filterTypes && opts.filterTypes.trim()) {
        opts.filterTypes = opts.filterTypes
          .split(',')
          .map((s: string) => s.trim());
      } else {
        opts.filterTypes = [];
      }
      return wrapCommand(changelog, opts);
    });

  // GitHub Release command
  cli
    .command('github-release', 'Create GitHub release from changelog')
    .option(
      '--release-version <version>',
      'Version to release (reads from package.json if not provided)',
    )
    .option('--tag-prefix <prefix>', 'Prefix for git tags')
    .option('--dry-run', 'Preview execution without creating actual release')
    .alias('gh-release')
    .action((opts) => {
      // Map release-version to version for compatibility
      if (opts.releaseVersion) {
        opts.version = opts.releaseVersion;
      }
      return wrapCommand(githubRelease, opts);
    });

  // Next Version command
  cli
    .command('next-version', 'Show next version options based on current version')
    .option('--cwd <cwd>', 'Current working directory')
    .action((opts) => {
      return wrapCommand(nextVersion, opts);
    });

  cli.version(pkg.version);
  cli.help();

  cli.parse();
}
