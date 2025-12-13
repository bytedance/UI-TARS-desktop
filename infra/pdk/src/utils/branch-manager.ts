/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Release branch management utilities
 */

import chalk from 'chalk';
import { getCurrentBranch, createAndSwitchBranch, switchBranch } from './git';
import { logger } from './logger';

/**
 * Manages release branch creation and restoration
 */
export class ReleaseBranchManager {
  private originalBranch: string | null = null;
  private releaseBranch: string | null = null;

  /**
   * Creates and switches to release branch
   */
  async createReleaseBranch(
    version: string,
    cwd: string,
    dryRun = false,
  ): Promise<void> {
    try {
      // Get current branch
      this.originalBranch = await getCurrentBranch(cwd);
      this.releaseBranch = `release/${version}`;

      if (dryRun) {
        logger.info(
          `[dry-run] Would create and switch to release branch: ${this.releaseBranch}`,
        );
        logger.info(`[dry-run] Original branch: ${this.originalBranch}`);
      } else {
        logger.info(`Creating release branch: ${this.releaseBranch}`);
        await createAndSwitchBranch(this.releaseBranch, cwd);
        logger.success(`Switched to release branch: ${this.releaseBranch}`);
      }
    } catch (err) {
      logger.error(
        `Failed to create release branch: ${(err as Error).message}`,
      );
      throw err;
    }
  }

  /**
   * Switches back to original branch
   */
  async switchBackToOriginalBranch(cwd: string, dryRun = false): Promise<void> {
    if (!this.originalBranch || !this.releaseBranch) {
      return;
    }

    try {
      if (dryRun) {
        logger.info(
          `[dry-run] Would switch back to original branch: ${this.originalBranch}`,
        );
        logger.info(`[dry-run] Release branch created: ${this.releaseBranch}`);
      } else {
        logger.info(
          `Switching back to original branch: ${this.originalBranch}`,
        );
        await switchBranch(this.originalBranch, cwd);
        logger.success(
          `Switched back to original branch: ${this.originalBranch}`,
        );
        logger.info(
          `Release branch created: ${chalk.cyan(this.releaseBranch)}`,
        );
      }
    } catch (err) {
      logger.warn(
        `Failed to switch back to original branch: ${(err as Error).message}`,
      );
      logger.info(
        `You are currently on release branch: ${chalk.cyan(this.releaseBranch)}`,
      );
    }
  }

  /**
   * Handles error cleanup by switching back to original branch
   */
  async handleBranchError(cwd: string, dryRun = false): Promise<void> {
    if (this.originalBranch && !dryRun) {
      try {
        logger.info(
          `Switching back to original branch due to error: ${this.originalBranch}`,
        );
        await switchBranch(this.originalBranch, cwd);
        logger.success(
          `Switched back to original branch: ${this.originalBranch}`,
        );
      } catch (switchErr) {
        logger.warn(
          `Failed to switch back to original branch: ${(switchErr as Error).message}`,
        );
      }
    }
  }

  /**
   * Get the current state
   */
  getState() {
    return {
      originalBranch: this.originalBranch,
      releaseBranch: this.releaseBranch,
    };
  }
}
