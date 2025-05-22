/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Agent, AgentRunOptions } from '@multimodal/agent';
import { AgentSnapshot } from './agent-snapshot';
import { SnapshotRunResult } from './types';

/**
 * Define case configurations for snapshot generation and testing
 */
export interface CaseConfig {
  /**
   * Case name.
   */
  name: string;
  /**
   * Case module path, export {@type SnapshotCase}
   */
  path: string;
  /**
   * Generated Snapshot path.
   */
  snapshotPath: string;
  vitestSnapshotPath: string;
}

interface SnapshotCase {
  agent: Agent;
  runOptions: AgentRunOptions;
}

export class AgentSnapshotRunner {
  public readonly examples: CaseConfig[];

  constructor(examples: CaseConfig[]) {
    console.log(JSON.stringify(examples, null, 2));

    this.examples = examples;
  }

  /**
   * Check if the update snapshot flag is present in command line arguments
   */
  private shouldUpdateSnapshots(): boolean {
    return process.argv.includes('-u') || process.argv.includes('--updateSnapshot');
  }

  /**
   * A simple cli to run agent snapshot
   */
  async cli() {
    {
      const args = process.argv.slice(2);
      const command = args[0];
      const exampleName = args[1];
      console.log(args, command, exampleName);

      // Check for update flag
      const updateSnapshots = this.shouldUpdateSnapshots();
      if (updateSnapshots) {
        console.log('Update snapshots mode enabled (-u flag detected)');
      }

      if (command === 'generate') {
        if (exampleName) {
          if (exampleName === 'all') {
            // Generate snapshots for all examples using wildcard
            await this.generateAll();
          } else {
            const example = this.getCaseByName(exampleName);
            if (example) {
              await this.generateSnapshot(example);
            } else {
              console.error(`Example "${exampleName}" not found.`);
              process.exit(1);
            }
          }
        } else {
          await this.generateAll();
        }
      } else if (command === 'replay') {
        if (exampleName) {
          if (exampleName === 'all') {
            // Test snapshots for all examples using wildcard
            await this.replayAll(updateSnapshots);
          } else {
            const example = this.getCaseByName(exampleName);
            if (example) {
              await this.replaySnapshot(example, updateSnapshots);
            } else {
              console.error(`Example "${exampleName}" not found.`);
              process.exit(1);
            }
          }
        } else {
          await this.replayAll(updateSnapshots);
        }
      } else {
        console.log('Usage: cli.ts [generate|replay] [example-name] [-u|--updateSnapshot]');
        console.log('Options:');
        console.log(
          '  -u, --updateSnapshot    Update snapshots when replaying (skips verification and updates files directly)',
        );
        console.log('Available examples:');
        this.examples.forEach((e) => console.log(`- ${e.name}`));
        console.log('- all  (all examples)');
      }
    }
  }

  /**
   * Get example config by name
   */
  getCaseByName(name: string): CaseConfig | undefined {
    return this.examples.find((e) => e.name === name);
  }

  /**
   * Load case
   */
  async loadSnapshotCase(exampleConfig: CaseConfig): Promise<SnapshotCase> {
    // const importPromise = new Function(`return import('${exampleConfig.path}')`)();
    const importedModule = await import(exampleConfig.path);

    if (importedModule.agent && importedModule.runOptions) {
      return importedModule;
    }

    if (
      importedModule.default &&
      importedModule.default.agent &&
      importedModule.default.runOptions
    ) {
      return importedModule.default;
    }

    throw new Error(
      `Invalid agent case module: ${exampleConfig.path}, required an "agent" instance and "runOptiond" exported`,
    );
  }

  /**
   * Generate snapshot for a specific example
   */
  async generateSnapshot(exampleConfig: CaseConfig): Promise<void> {
    console.log(`Generating snapshot for ${exampleConfig.name}...`);

    const { agent, runOptions } = await this.loadSnapshotCase(exampleConfig);
    const agentSnapshot = new AgentSnapshot(agent, {
      updateSnapshots: true,
      snapshotPath: exampleConfig.snapshotPath,
    });

    await agentSnapshot.generate(runOptions);
    console.log(`Snapshot generated at ${exampleConfig.snapshotPath}`);
  }

  /**
   * Replay snapshot for a specific example
   */
  async replaySnapshot(
    exampleConfig: CaseConfig,
    updateSnapshots = false,
  ): Promise<SnapshotRunResult> {
    console.log(`Testing snapshot for ${exampleConfig.name}...`);
    if (updateSnapshots) {
      console.log(`Update mode enabled: will update snapshots if they don't match`);
    }

    const { agent, runOptions } = await this.loadSnapshotCase(exampleConfig);

    console.log(`Testing agent instance`, agent);
    console.log(`Testing agent run options`, runOptions);

    if (!agent || !runOptions) {
      throw new Error(
        `Invalid agent case module: ${exampleConfig.path}, required an "agent" instance and "runOptiond" exported`,
      );
    }

    const agentSnapshot = new AgentSnapshot(agent, {
      snapshotPath: exampleConfig.snapshotPath,
      updateSnapshots, // Pass the update flag to AgentSnapshot
    });

    const response = await agentSnapshot.replay(runOptions);
    console.log(`Snapshot test result for ${exampleConfig.name}:`, response);
    return response;
  }

  /**
   * Generate snapshots for all examples
   */
  async generateAll(): Promise<void> {
    for (const example of this.examples) {
      await this.generateSnapshot(example);
    }
  }

  /**
   * Test snapshots for all examples
   */
  async replayAll(updateSnapshots = false): Promise<Record<string, unknown>> {
    const results: Record<string, unknown> = {};
    for (const example of this.examples) {
      results[example.name] = await this.replaySnapshot(example, updateSnapshots);
    }
    return results;
  }
}
