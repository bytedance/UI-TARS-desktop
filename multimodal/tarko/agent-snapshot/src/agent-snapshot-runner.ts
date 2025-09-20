/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentSnapshot } from './agent-snapshot';
import { SnapshotCaseConfig, SnapshotCase, SnapshotTestResult } from './types';
import { logger } from './utils/logger';

/**
 * AgentSnapshotRunner - Batch operations for multiple snapshot test cases
 * 
 * Provides utilities for generating and testing multiple agent snapshots,
 * useful for comprehensive test suites.
 */
export class AgentSnapshotRunner {
  private readonly cases: SnapshotCaseConfig[];

  constructor(cases: SnapshotCaseConfig[]) {
    this.cases = [...cases];
    logger.info(`Initialized runner with ${cases.length} test cases`);
  }

  /**
   * Command-line interface for snapshot operations
   */
  async cli(): Promise<void> {
    const args = process.argv.slice(2);
    const [command, caseName, ...flags] = args;
    
    const updateSnapshots = flags.includes('-u') || flags.includes('--updateSnapshot');
    
    if (updateSnapshots) {
      logger.info('Update snapshots mode enabled');
    }

    try {
      switch (command) {
        case 'generate':
          await this.handleGenerateCommand(caseName);
          break;
          
        case 'test':
        case 'replay': // backward compatibility
          await this.handleTestCommand(caseName, updateSnapshots);
          break;
          
        default:
          this.printUsage();
          break;
      }
    } catch (error) {
      logger.error(`Command failed: ${error}`);
      process.exit(1);
    }
  }

  /**
   * Generate snapshot for a specific case or all cases
   */
  async generate(caseName?: string): Promise<void> {
    if (caseName === 'all' || !caseName) {
      await this.generateAll();
    } else {
      const caseConfig = this.findCase(caseName);
      await this.generateSnapshot(caseConfig);
    }
  }

  /**
   * Test snapshot for a specific case or all cases
   */
  async test(caseName?: string, updateSnapshots = false): Promise<SnapshotTestResult | Record<string, SnapshotTestResult>> {
    if (caseName === 'all' || !caseName) {
      return this.testAll(updateSnapshots);
    } else {
      const caseConfig = this.findCase(caseName);
      return this.testSnapshot(caseConfig, updateSnapshots);
    }
  }

  /**
   * Generate snapshots for all cases
   */
  async generateAll(): Promise<void> {
    logger.info(`Generating snapshots for ${this.cases.length} cases`);
    
    for (const caseConfig of this.cases) {
      try {
        await this.generateSnapshot(caseConfig);
      } catch (error) {
        logger.error(`Failed to generate snapshot for ${caseConfig.name}: ${error}`);
        throw error;
      }
    }
    
    logger.success('All snapshots generated successfully');
  }

  /**
   * Test all snapshots
   */
  async testAll(updateSnapshots = false): Promise<Record<string, SnapshotTestResult>> {
    logger.info(`Testing ${this.cases.length} snapshots`);
    
    const results: Record<string, SnapshotTestResult> = {};
    
    for (const caseConfig of this.cases) {
      try {
        results[caseConfig.name] = await this.testSnapshot(caseConfig, updateSnapshots);
      } catch (error) {
        logger.error(`Test failed for ${caseConfig.name}: ${error}`);
        throw error;
      }
    }
    
    logger.success('All tests passed');
    return results;
  }

  /**
   * Get case configuration by name
   */
  getCase(name: string): SnapshotCaseConfig | undefined {
    return this.cases.find(c => c.name === name);
  }

  /**
   * List all available cases
   */
  listCases(): SnapshotCaseConfig[] {
    return [...this.cases];
  }

  private async handleGenerateCommand(caseName?: string): Promise<void> {
    if (!caseName) {
      await this.generateAll();
    } else if (caseName === 'all') {
      await this.generateAll();
    } else {
      const caseConfig = this.findCase(caseName);
      await this.generateSnapshot(caseConfig);
    }
  }

  private async handleTestCommand(caseName?: string, updateSnapshots = false): Promise<void> {
    if (!caseName) {
      await this.testAll(updateSnapshots);
    } else if (caseName === 'all') {
      await this.testAll(updateSnapshots);
    } else {
      const caseConfig = this.findCase(caseName);
      await this.testSnapshot(caseConfig, updateSnapshots);
    }
  }

  private findCase(name: string): SnapshotCaseConfig {
    const caseConfig = this.getCase(name);
    if (!caseConfig) {
      throw new Error(`Case "${name}" not found. Available cases: ${this.cases.map(c => c.name).join(', ')}`);
    }
    return caseConfig;
  }

  private async loadSnapshotCase(caseConfig: SnapshotCaseConfig): Promise<SnapshotCase> {
    try {
      const importedModule = await import(caseConfig.path);
      
      // Try default export first
      if (importedModule.default?.agent && importedModule.default?.runOptions) {
        return importedModule.default;
      }
      
      // Try named exports
      if (importedModule.agent && importedModule.runOptions) {
        return importedModule;
      }
      
      throw new Error(
        `Invalid case module: must export 'agent' and 'runOptions' (either as named exports or default export)`
      );
    } catch (error) {
      throw new Error(`Failed to load case module "${caseConfig.path}": ${error}`);
    }
  }

  private async generateSnapshot(caseConfig: SnapshotCaseConfig): Promise<void> {
    logger.info(`Generating snapshot: ${caseConfig.name}`);
    
    const { agent, runOptions } = await this.loadSnapshotCase(caseConfig);
    
    const snapshot = new AgentSnapshot(agent, {
      snapshotPath: caseConfig.snapshotPath,
      updateSnapshots: true,
    });

    await snapshot.generate(runOptions);
    logger.success(`Snapshot generated: ${caseConfig.snapshotPath}`);
  }

  private async testSnapshot(
    caseConfig: SnapshotCaseConfig,
    updateSnapshots = false
  ): Promise<SnapshotTestResult> {
    logger.info(`Testing snapshot: ${caseConfig.name}`);
    
    if (updateSnapshots) {
      logger.warn('Update mode: snapshots will be updated instead of verified');
    }

    const { agent, runOptions } = await this.loadSnapshotCase(caseConfig);

    const snapshot = new AgentSnapshot(agent, {
      snapshotPath: caseConfig.snapshotPath,
      updateSnapshots,
    });

    const result = await snapshot.test(runOptions);
    logger.success(`Test passed: ${caseConfig.name}`);
    
    return result;
  }

  private printUsage(): void {
    console.log('Usage: runner [command] [case-name] [options]');
    console.log('');
    console.log('Commands:');
    console.log('  generate [case-name|all]  Generate snapshots');
    console.log('  test [case-name|all]      Test against snapshots');
    console.log('');
    console.log('Options:');
    console.log('  -u, --updateSnapshot      Update snapshots during testing');
    console.log('');
    console.log('Available cases:');
    this.cases.forEach(c => console.log(`  - ${c.name}`));
    console.log('  - all (all cases)');
  }
}

// Re-export for backward compatibility
/** @deprecated Use SnapshotCaseConfig instead */
export type CaseConfig = SnapshotCaseConfig;
