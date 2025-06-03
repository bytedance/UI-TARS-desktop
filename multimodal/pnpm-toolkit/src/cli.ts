/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * CLI entry point for PTK
 */
import { cac } from 'cac';
import { dev, release, patch, changelog } from './index';
import { logger } from './utils/logger';

/**
 * Wraps a command execution with error handling
 */
// eslint-disable-next-line @typescript-eslint/ban-types
async function wrapCommand(command: Function, options: Record<string, unknown>) {
  options.cwd = options.cwd || process.cwd();

  try {
    await command(options);
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
  const cli = cac('ptk');
  const pkg = require('../package.json');

  // Global options
  cli.option('--cwd <cwd>', 'Current working directory', {
    default: process.cwd(),
  });

  // Dev command
  cli
    .command('d', 'Quickly launch on-demand development build for monorepo')
    .alias('dev')
    .option('--exclude <packages>', 'Comma-separated list of packages to exclude', {
      default: '',
    })
    .action((opts) => wrapCommand(dev, opts));

  // Release command
  cli
    .command('r', 'Release your monorepo')
    .option('--changelog', 'Whether to generate changelog', {
      default: true,
    })
    .option('--push-tag', 'Automatically push git tag to remote', {
      default: false,
    })
    .option('--build [build]', 'Execute custom build script before release', {
      default: false,
    })
    .option('--dry-run', 'Preview execution without making changes', {
      default: false,
    })
    .option('--run-in-band', 'Whether to publish package in series', {
      default: false,
    })
    .option('--ignore-scripts', 'Ignore npm scripts during release and patch process', {
      default: false,
    })
    .option('--tag-prefix <prefix>', 'Prefix for git tags', {
      default: 'v',
    })
    .option('--use-ai', 'Use AI to generate changelog', {
      default: false,
    })
    .option('--provider <provider>', 'LLM provider to use (default: openai)')
    .option('--model <model>', 'LLM model to use (default: gpt-4o)')
    .option('--apiKey, --api-key <apiKey>', 'Custom API key for LLM')
    .option('--baseURL, --base-url <baseURL>', 'Custom base URL for LLM')
    .alias('release')
    .action((opts) => {
      return wrapCommand(release, opts);
    });

  // Patch command
  cli
    .command('p', 'Patch the failure of release process')
    .option('--version <version>', 'Version (e.g. 1.0.0, 2.0.0-alpha.9)', {
      // There is no default value here, because the default is read from package.json
    })
    .option('--tag <tag>', 'Tag (e.g. latest, next, beta)')
    .option('--run-in-band', 'Whether to publish package in series', {
      default: false,
    })
    .option('--ignore-scripts', 'Ignore npm scripts under patch process', {
      default: false,
    })
    .alias('patch')
    .action((opts) => wrapCommand(patch, opts));

  // Changelog command
  cli
    .command('changelog', 'Create changelog')
    .option('--version <version>', 'Version', {
      // There is no default value here, because the default is read from package.json
    })
    .option('--tag-prefix <prefix>', 'Prefix for git tags', {
      default: 'v',
    })
    .option('--beautify', 'Beautify changelog or not', {
      default: false,
    })
    .option('--commit', 'Create git commit or not', {
      default: false,
    })
    .option('--git-push', 'Execute git push or not', {
      default: false,
    })
    .option('--attach-author', 'Add author or not', {
      default: false,
    })
    .option('--author-name-type <type>', 'Type of author name: name or email', {
      default: 'name',
    })
    .option('--use-ai', 'Use AI to generate changelog', {
      default: false,
    })
    .option('--provider <provider>', 'LLM provider to use (default: openai)')
    .option('--model <model>', 'LLM model to use (default: gpt-4o)')
    .option('--apiKey, --api-key <apiKey>', 'Custom API key for LLM')
    .option('--baseURL, --base-url <baseURL>', 'Custom base URL for LLM')
    .action((opts) => wrapCommand(changelog, opts));

  cli.version(pkg.version);
  cli.help();

  cli.parse();
}
