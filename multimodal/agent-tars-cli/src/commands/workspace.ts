/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { CAC } from 'cac';
import * as p from '@clack/prompts';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import Conf from 'conf';
import chalk from 'chalk';
import { logger } from '../utils';
import { getBootstrapCliOptions } from '../core/state';

// Define types for configuration
interface WorkspaceConfig {
  globalWorkspaceCreated: boolean;
}

// Create configuration store
const configStore = new Conf<WorkspaceConfig>({
  projectName: 'agent-tars-cli',
  defaults: {
    globalWorkspaceCreated: false,
  },
});

// Model provider options
type ModelProvider = 'volcengine' | 'anthropic' | 'openai' | 'azure-openai';
type ConfigFormat = 'ts' | 'json' | 'yaml';

interface WorkspaceOptions {
  init?: boolean;
  open?: boolean;
}

/**
 * Initialize a new Agent TARS workspace
 */
async function initWorkspace(): Promise<void> {
  const workspacePath = path.join(os.homedir(), '.agent-tars-workspace');

  p.intro(`${chalk.blue('Agent TARS')} workspace initialization`);

  // Check if workspace already exists
  if (fs.existsSync(workspacePath)) {
    const shouldContinue = await p.confirm({
      message: 'Workspace already exists. Continue and overwrite?',
      initialValue: false,
    });

    if (!shouldContinue) {
      p.outro('Workspace initialization cancelled.');
      return;
    }

    // If we continue, remove the old directory
    fs.rmSync(workspacePath, { recursive: true, force: true });
  }

  // Create workspace directory
  fs.mkdirSync(workspacePath, { recursive: true });

  // Configuration selections
  const configFormat = await p.select({
    message: 'Select configuration format:',
    options: [
      { value: 'ts' as const, label: 'TypeScript (recommended)' },
      { value: 'json' as const, label: 'JSON' },
      { value: 'yaml' as const, label: 'YAML' },
    ],
  });

  if (p.isCancel(configFormat)) {
    p.cancel('Workspace initialization cancelled');
    return;
  }

  const modelProvider = await p.select({
    message: 'Select default model provider:',
    options: [
      { value: 'volcengine' as const, label: 'Volcengine' },
      { value: 'anthropic' as const, label: 'Anthropic' },
      { value: 'openai' as const, label: 'OpenAI' },
      { value: 'azure-openai' as const, label: 'Azure OpenAI' },
    ],
  });

  if (p.isCancel(modelProvider)) {
    p.cancel('Workspace initialization cancelled');
    return;
  }

  const initGit = await p.confirm({
    message: 'Initialize git repository? (Recommended for version control)',
    initialValue: true,
  });

  if (p.isCancel(initGit)) {
    p.cancel('Workspace initialization cancelled');
    return;
  }

  const s = p.spinner();
  s.start('Creating workspace...');

  try {
    // Create configuration file based on chosen format
    switch (configFormat) {
      case 'ts':
        // For TypeScript, we need to install the interface package
        await createTypeScriptConfig(workspacePath, modelProvider);
        break;

      case 'json':
        await createJsonConfig(workspacePath, modelProvider);
        break;

      case 'yaml':
        await createYamlConfig(workspacePath, modelProvider);
        break;
    }

    // Initialize git if selected
    if (initGit) {
      s.message('Initializing git repository...');
      await initGitRepo(workspacePath);
    }

    // Mark workspace as created
    configStore.set('globalWorkspaceCreated', true);

    s.stop('Workspace created successfully!');

    p.outro(
      [
        '\n',
        `${chalk.green('✓')} Workspace created at ${chalk.blue(workspacePath)}`,
        `${chalk.green('✓')} Configuration format: ${chalk.blue(configFormat)}`,
        `${chalk.green('✓')} Default model provider: ${chalk.blue(modelProvider)}`,
        `${chalk.green('✓')} To see all configiurations, check: ${chalk.blue('https://beta.agent-tars.com/api/config/agent.html')}`,
        `${chalk.green('✓')} To open your workspace, run: ${chalk.blue('agent-tars workspace --open')}`,
      ].join('\n'),
    );
  } catch (error) {
    s.stop('Failed to create workspace');
    p.outro(`${chalk.red('✗')} Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Create TypeScript configuration for workspace
 */
async function createTypeScriptConfig(
  workspacePath: string,
  modelProvider: ModelProvider,
): Promise<void> {
  // Create package.json
  const packageJson = {
    name: 'my-agent-tars-global-workspace',
    version: '0.1.0',
    private: true,
    dependencies: {
      '@agent-tars/interface': getBootstrapCliOptions().version || 'latest',
    },
  };

  fs.writeFileSync(path.join(workspacePath, 'package.json'), JSON.stringify(packageJson, null, 2));

  // Create tsconfig.json
  const tsConfig = {
    compilerOptions: {
      target: 'es2022',
      module: 'commonjs',
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      strict: true,
    },
  };

  fs.writeFileSync(path.join(workspacePath, 'tsconfig.json'), JSON.stringify(tsConfig, null, 2));

  // Create config file
  const configContent = `import { defineConfig } from '@agent-tars/interface';

/**
 * @see {@link https://beta.agent-tars.com/api/config/agent.html}
 */
export default defineConfig({
  model: {
    provider: '${modelProvider}'
  }
});
`;

  fs.writeFileSync(path.join(workspacePath, 'agent-tars.config.ts'), configContent);

  // Install dependencies
  await installDependencies(workspacePath);
}

/**
 * Create JSON configuration for workspace
 */
function createJsonConfig(workspacePath: string, modelProvider: ModelProvider): Promise<void> {
  const config = {
    model: {
      provider: modelProvider,
    },
  };

  fs.writeFileSync(
    path.join(workspacePath, 'agent-tars.config.json'),
    JSON.stringify(config, null, 2),
  );

  return Promise.resolve();
}

/**
 * Create YAML configuration for workspace
 */
function createYamlConfig(workspacePath: string, modelProvider: ModelProvider): Promise<void> {
  const configContent = `model:
  provider: ${modelProvider}
`;

  fs.writeFileSync(path.join(workspacePath, 'agent-tars.config.yaml'), configContent);

  return Promise.resolve();
}

/**
 * Install npm dependencies for TypeScript workspace
 */
async function installDependencies(workspacePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const npm = spawn('npm', ['install'], {
      cwd: workspacePath,
      stdio: 'ignore',
      shell: true,
    });

    npm.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`npm install failed with code ${code}`));
      }
    });

    npm.on('error', reject);
  });
}

/**
 * Initialize git repository
 */
async function initGitRepo(workspacePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const git = spawn('git', ['init'], {
      cwd: workspacePath,
      stdio: 'ignore',
      shell: true,
    });

    git.on('close', (code) => {
      if (code === 0) {
        // Create .gitignore file
        const gitignore = `node_modules/
.DS_Store
`;
        fs.writeFileSync(path.join(workspacePath, '.gitignore'), gitignore);
        resolve();
      } else {
        reject(new Error(`git init failed with code ${code}`));
      }
    });

    git.on('error', reject);
  });
}

/**
 * Open the workspace in VSCode if available
 */
async function openWorkspace(): Promise<void> {
  const workspacePath = path.join(os.homedir(), '.agent-tars-workspace');

  // Check if workspace exists
  if (!fs.existsSync(workspacePath)) {
    logger.error(
      `Workspace not found at ${workspacePath}. Please run 'agent-tars workspace --init' first.`,
    );
    return;
  }

  // Check if VSCode is installed
  const execPromise = promisify(exec);
  try {
    await execPromise('code --version');

    // Open workspace in VSCode
    exec(`code "${workspacePath}"`, (error) => {
      if (error) {
        logger.error(`Failed to open workspace: ${error.message}`);
      }
    });

    logger.info(`Opening workspace at ${workspacePath}`);
  } catch (error) {
    logger.warn('VSCode not found. Please install VSCode or manually open the workspace:');
    logger.info(`Workspace path: ${workspacePath}`);
  }
}

/**
 * Process workspace command
 */
export async function processWorkspaceCommand(options: WorkspaceOptions): Promise<void> {
  try {
    if (options.init) {
      await initWorkspace();
    } else if (options.open) {
      await openWorkspace();
    } else {
      logger.error('Please specify a command: --init or --open');
    }
  } catch (err) {
    logger.error(`Workspace command failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Register the workspace command
 */
export function registerWorkspaceCommand(cli: CAC): void {
  cli
    .command('workspace', 'Manage Agent TARS workspace')
    .option('--init', 'Initialize a new workspace')
    .option('--open', 'Open workspace in VSCode')
    .action(async (options: WorkspaceOptions = {}) => {
      await processWorkspaceCommand(options);
    });
}

/**
 * Check if global workspace is created
 * Used by other commands to determine default working directory
 */
export function isGlobalWorkspaceCreated(): boolean {
  return configStore.get('globalWorkspaceCreated');
}

/**
 * Get global workspace path
 */
export function getGlobalWorkspacePath(): string {
  return path.join(os.homedir(), '.agent-tars-workspace');
}
