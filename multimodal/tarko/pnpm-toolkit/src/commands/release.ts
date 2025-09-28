/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Release command implementation
 * Manages version updates and package publishing
 */
import { join } from 'path';
import { readFileSync, writeFileSync, readJsonSync, writeJsonSync } from 'fs-extra';
import inquirer from 'inquirer';
import semver from 'semver';
import chalk from 'chalk';
import { execa } from 'execa';

import { loadWorkspacePackages, resolveWorkspaceConfig } from '../utils/workspace';
import { gitCommit, gitCreateTag, gitPushTag, getCurrentBranch, createAndSwitchBranch, switchBranch } from '../utils/git';
import { publishPackage } from '../utils/npm';
import { logger } from '../utils/logger';
import { createGitHubRelease } from '../utils/github';
import { patch } from './patch';
import { changelog } from './changelog';

import type { ReleaseOptions, WorkspacePackage, PackageJson } from '../types';

// Keeps track of original dependencies to restore after publishing
interface DependencyBackup {
  packagePath: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

/**
 * Generates canary version with format: {version}-canary-{commitHash}-{timestamp}
 */
async function generateCanaryVersion(
  currentVersion: string,
  cwd: string,
): Promise<{ version: string; tag: string }> {
  // Get current commit hash (short)
  const { stdout: commitHash } = await execa('git', ['rev-parse', '--short', 'HEAD'], { cwd });

  // Generate timestamp
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14); // YYYYMMDDHHMMSS

  // Generate canary version
  const canaryVersion = `${currentVersion}-canary-${commitHash.trim()}-${timestamp}`;

  return {
    version: canaryVersion,
    tag: 'nightly',
  };
}

/**
 * Prompts user to select version and tag
 */
async function selectVersionAndTag(
  currentVersion: string,
): Promise<{ version: string; tag: string }> {
  const customItem = { name: 'Custom', value: 'custom' };
  const bumps = ['patch', 'minor', 'major', 'prerelease', 'premajor'] as const;

  const versions = bumps.reduce<Record<string, string>>((acc, bump) => {
    acc[bump] = semver.inc(currentVersion, bump) || '';
    return acc;
  }, {});

  const bumpChoices = bumps.map((bump) => ({
    name: `${bump} (${versions[bump]})`,
    value: bump,
  }));

  const getNpmTags = (version: string) => {
    if (semver.prerelease(version)) {
      return ['next', 'latest', 'beta', customItem];
    }
    return ['latest', 'next', 'beta', customItem];
  };

  const { bump, customVersion, npmTag, customNpmTag } = await inquirer.prompt([
    {
      name: 'bump',
      message: 'Select release type:',
      type: 'list',
      choices: [...bumpChoices, customItem],
    },
    {
      name: 'customVersion',
      message: 'Input version:',
      type: 'input',
      when: (answers) => answers.bump === 'custom',
      validate: (input) => (semver.valid(input) ? true : 'Please enter a valid semver version'),
    },
    {
      name: 'npmTag',
      message: 'Input npm tag:',
      type: 'list',
      choices: (answers) => getNpmTags(answers.customVersion || versions[answers.bump]),
    },
    {
      name: 'customNpmTag',
      message: 'Input customized npm tag:',
      type: 'input',
      when: (answers) => answers.npmTag === 'custom',
    },
  ]);

  const version = customVersion || versions[bump];
  const tag = customNpmTag || npmTag;

  return { version, tag };
}

/**
 * Updates package.json version and dependencies
 */
async function updatePackageVersions(
  packages: WorkspacePackage[],
  version: string,
  dryRun = false,
): Promise<DependencyBackup[]> {
  const backups: DependencyBackup[] = [];

  for (const pkg of packages) {
    const packageJsonPath = join(pkg.dir, 'package.json');
    const packageJson = readJsonSync(packageJsonPath);

    // Create backup - store the entire original content to ensure exact restore
    backups.push({
      packagePath: packageJsonPath,
      dependencies: packageJson.dependencies ? { ...packageJson.dependencies } : undefined,
      devDependencies: packageJson.devDependencies ? { ...packageJson.devDependencies } : undefined,
      peerDependencies: packageJson.peerDependencies
        ? { ...packageJson.peerDependencies }
        : undefined,
    });

    if (dryRun) {
      logger.info(`[dry-run] Would update ${pkg.name} to version ${version}`);
      continue;
    }

    // Update version
    packageJson.version = version;

    // Update internal dependencies to point to the new version
    const updateDeps = (deps?: Record<string, string>) => {
      if (!deps) return;

      Object.keys(deps).forEach((dep) => {
        // Check if this is a workspace dependency (any form of workspace: prefix)
        if (deps[dep] && deps[dep].startsWith('workspace:')) {
          // Find the package in workspace
          const depPkg = packages.find((p) => p.name === dep);
          if (depPkg) {
            // Replace workspace reference with actual version
            logger.info(`Replacing ${pkg.name}'s dependency ${dep}: ${deps[dep]} → ${version}`);
            deps[dep] = version;
          }
        }
      });
    };

    updateDeps(packageJson.dependencies);
    updateDeps(packageJson.devDependencies);
    updateDeps(packageJson.peerDependencies);

    writeJsonSync(packageJsonPath, packageJson, { spaces: 2 });
  }

  return backups;
}

/**
 * Restores original workspace dependencies
 */
async function restoreDependencies(backups: DependencyBackup[], dryRun = false): Promise<void> {
  if (dryRun) {
    logger.info(`[dry-run] Would restore dependencies for ${backups.length} packages`);
    return;
  }

  logger.info('Restoring workspace dependencies...');

  for (const backup of backups) {
    try {
      const packageJson = readJsonSync(backup.packagePath);

      // Restore dependencies
      if (backup.dependencies) {
        packageJson.dependencies = backup.dependencies;
      }

      // Restore devDependencies
      if (backup.devDependencies) {
        packageJson.devDependencies = backup.devDependencies;
      }

      // Restore peerDependencies
      if (backup.peerDependencies) {
        packageJson.peerDependencies = backup.peerDependencies;
      }

      writeJsonSync(backup.packagePath, packageJson, { spaces: 2 });
    } catch (err) {
      logger.error(
        `Failed to restore dependencies for ${backup.packagePath}: ${(err as Error).message}`,
      );
    }
  }

  logger.success('Successfully restored all workspace dependencies');
}

/**
 * Release command implementation
 */
export async function release(options: ReleaseOptions = {}): Promise<void> {
  const {
    cwd = process.cwd(),
    dryRun = false,
    changelog: generateChangelog = true,
    runInBand = false,
    ignoreScripts = false,
    build = false,
    pushTag = false,
    tagPrefix = 'v',
    canary = false,
    useAi = false,
    createGithubRelease = false,
    autoCreateReleaseBranch = false,
  } = options;

  if (dryRun) {
    logger.info('Dry run mode enabled - no actual changes will be made');
  }

  // Handle auto-create release branch variables
  let originalBranch: string | null = null;
  let releaseBranch: string | null = null;

  try {
    // Get workspace configuration
    const config = resolveWorkspaceConfig(cwd);
    const currentVersion = config.rootPackageJson.version || '0.0.0';

    logger.info(`Current version: ${currentVersion}`);

    // Get version and tag based on canary mode
    let version: string;
    let tag: string;

    if (canary) {
      // Skip prompts for canary release
      const canaryResult = await generateCanaryVersion(currentVersion, cwd);
      version = canaryResult.version;
      tag = canaryResult.tag;
      logger.info(`Canary release: ${version} (${tag})`);
    } else {
      // Prompt for version and tag
      const result = await selectVersionAndTag(currentVersion);
      version = result.version;
      tag = result.tag;

      const { yes } = await inquirer.prompt([
        {
          name: 'yes',
          message: `Confirm releasing ${version} (${tag})?`,
          type: 'list',
          choices: ['N', 'Y'],
        },
      ]);

      if (yes === 'N') {
        logger.info('Release cancelled.');
        return;
      }
    }

    // Handle auto-create release branch
    if (autoCreateReleaseBranch) {
      try {
        // Get current branch
        originalBranch = await getCurrentBranch(cwd);
        releaseBranch = `release/${version}`;

        if (dryRun) {
          logger.info(`[dry-run] Would create and switch to release branch: ${releaseBranch}`);
          logger.info(`[dry-run] Original branch: ${originalBranch}`);
        } else {
          logger.info(`Creating release branch: ${releaseBranch}`);
          await createAndSwitchBranch(releaseBranch, cwd);
          logger.success(`Switched to release branch: ${releaseBranch}`);
        }
      } catch (err) {
        logger.error(`Failed to create release branch: ${(err as Error).message}`);
        throw err;
      }
    }

    // Set environment variable for build scripts
    process.env.RELEASE_VERSION = version;

    // Run build script if specified
    if (build) {
      const buildScript = typeof build === 'string' ? build : 'npm run build';

      if (dryRun) {
        logger.info(`[dry-run] Would run build with: ${buildScript}`);
      } else {
        logger.info(`Running build script: ${buildScript}`);
        const [command, ...args] = buildScript.split(' ');
        await execa(command, args, {
          shell: true,
          cwd,
          stdio: 'inherit',
          env: process.env,
        });
      }
    }

    // Load workspace packages
    const packages = await loadWorkspacePackages(cwd);

    // Filter packages to publish
    const packagesToPublish = packages.filter((pkg) => !pkg.isPrivate);

    if (packagesToPublish.length === 0) {
      logger.warn('No packages to publish! Check your workspace configuration.');
      return;
    }

    // Confirm packages to publish (skip in canary mode)
    console.log(chalk.bold('\nPackages to be published:'));
    packagesToPublish.forEach((pkg) => {
      console.log(`  - ${chalk.cyan(pkg.name)} (${chalk.gray(pkg.dir)})`);
    });
    console.log();

    if (!canary) {
      const { confirmPublish } = await inquirer.prompt([
        {
          name: 'confirmPublish',
          message: 'Are these the correct packages to publish?',
          type: 'list',
          choices: ['Y', 'N'],
        },
      ]);

      if (confirmPublish === 'N') {
        logger.info('Publication cancelled.');
        return;
      }
    }

    // Update package versions
    const backups = await updatePackageVersions(packages, version, dryRun);

    // Update root package.json version
    if (!dryRun) {
      const rootPackageJsonPath = join(cwd, 'package.json');
      const rootPackageJson = readJsonSync(rootPackageJsonPath);
      rootPackageJson.version = version;
      writeJsonSync(rootPackageJsonPath, rootPackageJson, { spaces: 2 });
    }

    // Verify workspace dependencies were properly replaced
    if (!dryRun) {
      logger.info('Verifying workspace dependencies replacement...');
      let hasWorkspaceDeps = false;

      for (const pkg of packages) {
        const packageJsonPath = join(pkg.dir, 'package.json');
        const packageJson = readJsonSync(packageJsonPath);

        const checkDeps = (deps?: Record<string, string>, type = 'dependencies') => {
          if (!deps) return;

          Object.entries(deps).forEach(([dep, depVersion]) => {
            if (depVersion.startsWith('workspace:')) {
              hasWorkspaceDeps = true;
              logger.warn(
                `Found unreplaced workspace dependency in ${pkg.name} ${type}: ${dep}: ${depVersion}`,
              );
            }
          });
        };

        checkDeps(packageJson.dependencies);
        checkDeps(packageJson.devDependencies, 'devDependencies');
        checkDeps(packageJson.peerDependencies, 'peerDependencies');
      }

      if (hasWorkspaceDeps) {
        if (canary) {
          logger.warn('Unreplaced workspace dependencies found in canary mode, continuing anyway');
        } else {
          const { continuePublish } = await inquirer.prompt([
            {
              name: 'continuePublish',
              message: 'Unreplaced workspace dependencies found. Continue with publishing?',
              type: 'list',
              choices: ['No', 'Yes'],
            },
          ]);

          if (continuePublish === 'No') {
            await restoreDependencies(backups, dryRun);
            logger.info('Publishing cancelled, dependencies restored');
            return;
          }
        }
      } else {
        logger.success('All workspace dependencies properly replaced');
      }
    }

    // Publish packages
    try {
      if (runInBand) {
        for (const pkg of packagesToPublish) {
          logger.info(`Publishing ${pkg.name}...`);
          await publishPackage(pkg.dir, tag, ignoreScripts, dryRun);
        }
      } else {
        await Promise.all(
          packagesToPublish.map(async (pkg) => {
            logger.info(`Publishing ${pkg.name}...`);
            await publishPackage(pkg.dir, tag, ignoreScripts, dryRun);
          }),
        );
      }
    } catch (error) {
      logger.error(`Error during publish: ${(error as Error).message}`);
      logger.info('Will restore dependencies before exiting');
      throw error;
    } finally {
      // Always restore dependencies, even if publishing fails
      await restoreDependencies(backups, dryRun);
    }

    // Git tag related operations
    const tagName = `${tagPrefix}${version}`;

    if (dryRun) {
      logger.info(`[dry-run] Would create git commit: chore(release): release ${version}`);
      logger.info(`[dry-run] Would create git tag: ${tagName}`);
      if (pushTag) {
        logger.info(`[dry-run] Would push git tag ${tagName} to remote`);
      }
    } else {
      try {
        // Check if tag already exists
        const checkTag = await execa('git', ['tag', '-l', tagName], { cwd });

        if (checkTag.stdout.trim() === tagName) {
          logger.warn(`Tag ${tagName} already exists, skipping tag creation`);
        } else {
          // Commit changes
          await gitCommit(`chore(tars-stack): release ${version}`, cwd);

          // Create tag
          await gitCreateTag(tagName, `Release ${version}`, cwd);
          logger.success(`Created git tag: ${tagName}`);

          // Push tag if requested
          if (pushTag) {
            try {
              logger.info(`Pushing git tag to remote...`);
              await gitPushTag(tagName, true, cwd);
              logger.success(`Successfully pushed tag and commit to remote`);
            } catch (err) {
              logger.error(`Failed to push to remote: ${(err as Error).message}`);
              logger.info(`You can manually push the tag later with: git push origin ${tagName}`);
            }
          } else {
            // Ask if user wants to push (skip in canary mode)
            if (canary) {
              // Auto-push in canary mode
              try {
                logger.info(`Auto-pushing git tag to remote in canary mode...`);
                await gitPushTag(tagName, true, cwd);
                logger.success(`Successfully pushed tag and commit to remote`);
              } catch (err) {
                logger.error(`Failed to push to remote: ${(err as Error).message}`);
                logger.info(`You can manually push the tag later with: git push origin ${tagName}`);
              }
            } else {
              const { pushToRemote } = await inquirer.prompt([
                {
                  name: 'pushToRemote',
                  message: `Push tag ${tagName} to remote repository?`,
                  type: 'list',
                  choices: ['Yes', 'No'],
                },
              ]);

              if (pushToRemote === 'Yes') {
                try {
                  logger.info(`Pushing git tag to remote...`);
                  await gitPushTag(tagName, true, cwd);
                  logger.success(`Successfully pushed tag and commit to remote`);
                } catch (err) {
                  logger.error(`Failed to push to remote: ${(err as Error).message}`);
                  logger.info(
                    `You can manually push the tag later with: git push origin ${tagName}`,
                  );
                }
              }
            }
          }
        }
      } catch (err) {
        logger.error(`Failed to create git tag: ${(err as Error).message}`);
      }
    }

    // Generate changelog
    if (generateChangelog) {
      const changelogOptions = {
        cwd,
        version,
        beautify: true,
        commit: !dryRun,
        gitPush: !dryRun,
        attachAuthor: false,
        authorNameType: 'name' as const,
        useAi: options.useAi,
        model: options.model,
        apiKey: options.apiKey,
        baseURL: options.baseURL,
        provider: options.provider,
        tagPrefix: tagPrefix,
        dryRun: dryRun && !useAi, // 只有在非 AI 模式下才考虑 dryRun 标志
        filterScopes: options.filterScopes,
        filterTypes: options.filterTypes,
      };

      if (dryRun && !useAi) {
        logger.info(
          `[dry-run] Would generate changelog with options: ${JSON.stringify(changelogOptions)}`,
        );
      } else {
        // 在 dry-run + useAi 模式下，真实运行 changelog 生成
        if (dryRun && useAi) {
          logger.info(`Running AI changelog generation even in dry-run mode for testing purposes`);
        }
        await changelog(changelogOptions);
      }
    }

    // Create GitHub release if requested
    if (createGithubRelease) {
      try {
        await createGitHubRelease({
          version,
          tagName,
          cwd,
          dryRun,
        });
      } catch (error) {
        logger.error(`Failed to create GitHub release: ${(error as Error).message}`);
        logger.warn('Release was successful but GitHub release creation failed');
        // Don't throw here as the main release was successful
      }
    }

    // Switch back to original branch if auto-create release branch was used
    if (autoCreateReleaseBranch && originalBranch && releaseBranch) {
      try {
        if (dryRun) {
          logger.info(`[dry-run] Would switch back to original branch: ${originalBranch}`);
          logger.info(`[dry-run] Release branch created: ${releaseBranch}`);
        } else {
          logger.info(`Switching back to original branch: ${originalBranch}`);
          await switchBranch(originalBranch, cwd);
          logger.success(`Switched back to original branch: ${originalBranch}`);
          logger.info(`Release branch created: ${chalk.cyan(releaseBranch)}`);
        }
      } catch (err) {
        logger.warn(`Failed to switch back to original branch: ${(err as Error).message}`);
        logger.info(`You are currently on release branch: ${chalk.cyan(releaseBranch)}`);
      }
    }

    logger.success(`Release ${version} completed successfully!`);
  } catch (err) {
    logger.error(`Release failed: ${(err as Error).message}`);

    // Switch back to original branch if auto-create release branch was used
    if (autoCreateReleaseBranch && originalBranch && !dryRun) {
      try {
        logger.info(`Switching back to original branch due to error: ${originalBranch}`);
        await switchBranch(originalBranch, cwd);
        logger.success(`Switched back to original branch: ${originalBranch}`);
      } catch (switchErr) {
        logger.warn(`Failed to switch back to original branch: ${(switchErr as Error).message}`);
      }
    }

    // Try to patch the failed release
    if (!dryRun) {
      const { version, tag } = await selectVersionAndTag(
        resolveWorkspaceConfig(cwd).rootPackageJson.version || '0.0.0',
      );

      await patch({
        cwd,
        version,
        tag,
        runInBand: !!runInBand,
        ignoreScripts: !!ignoreScripts,
      });
    }

    throw err;
  }
}
