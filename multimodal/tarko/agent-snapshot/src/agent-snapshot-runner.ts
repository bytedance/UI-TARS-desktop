/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Agent, AgentRunOptions } from '@tarko/agent';
import { AgentSnapshot } from './agent-snapshot';
import { SnapshotRunResult } from './types';

export interface CaseConfig {
  name: string;
  path: string;
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
    this.examples = examples;
  }

  private shouldUpdateSnapshots(): boolean {
    return process.argv.includes('-u') || process.argv.includes('--updateSnapshot');
  }

  async cli() {
    const args = process.argv.slice(2);
    const command = args[0];
    const exampleName = args[1];
    const updateSnapshots = this.shouldUpdateSnapshots();

    if (updateSnapshots) {
      console.log('Update snapshots mode enabled (-u flag detected)');
    }

    if (command === 'generate') {
      await this.handleGenerateCommand(exampleName);
    } else if (command === 'replay') {
      await this.handleReplayCommand(exampleName, updateSnapshots);
    } else {
      this.printUsage();
    }
  }

  private async handleGenerateCommand(exampleName?: string): Promise<void> {
    if (!exampleName) {
      await this.generateAll();
    } else if (exampleName === 'all') {
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
  }

  private async handleReplayCommand(exampleName?: string, updateSnapshots = false): Promise<void> {
    if (!exampleName) {
      await this.replayAll(updateSnapshots);
    } else if (exampleName === 'all') {
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
  }

  private printUsage(): void {
    console.log('Usage: cli.ts [generate|replay] [example-name] [-u|--updateSnapshot]');
    console.log('Options:');
    console.log(
      '  -u, --updateSnapshot    Update snapshots when replaying (skips verification and updates files directly)',
    );
    console.log('Available examples:');
    this.examples.forEach((e) => console.log(`- ${e.name}`));
    console.log('- all  (all examples)');
  }

  getCaseByName(name: string): CaseConfig | undefined {
    return this.examples.find((e) => e.name === name);
  }

  async loadSnapshotCase(exampleConfig: CaseConfig): Promise<SnapshotCase> {
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
      `Invalid agent case module: ${exampleConfig.path}, required an "agent" instance and "runOptions" exported`,
    );
  }

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

  async replaySnapshot(
    exampleConfig: CaseConfig,
    updateSnapshots = false,
  ): Promise<SnapshotRunResult> {
    console.log(`Testing snapshot for ${exampleConfig.name}...`);
    if (updateSnapshots) {
      console.log(`Update mode enabled: will update snapshots if they don't match`);
    }

    const { agent, runOptions } = await this.loadSnapshotCase(exampleConfig);

    if (!agent || !runOptions) {
      throw new Error(
        `Invalid agent case module: ${exampleConfig.path}, required an "agent" instance and "runOptions" exported`,
      );
    }

    const agentSnapshot = new AgentSnapshot(agent, {
      snapshotPath: exampleConfig.snapshotPath,
      updateSnapshots,
    });

    const response = await agentSnapshot.replay(runOptions);
    console.log(`Snapshot test result for ${exampleConfig.name}:`, response);
    return response;
  }

  async generateAll(): Promise<void> {
    for (const example of this.examples) {
      await this.generateSnapshot(example);
    }
  }

  async replayAll(updateSnapshots = false): Promise<Record<string, unknown>> {
    const results: Record<string, unknown> = {};
    for (const example of this.examples) {
      results[example.name] = await this.replaySnapshot(example, updateSnapshots);
    }
    return results;
  }
}
