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
import boxen from 'boxen';

// Define types for configuration
interface WorkspaceConfig {
  globalWorkspaceCreated: boolean;
  globalWorkspaceEnabled: boolean;
}

// Create configuration store
const configStore = new Conf<WorkspaceConfig>({
  projectName: 'agent-tars-cli',
  defaults: {
    globalWorkspaceCreated: false,
    globalWorkspaceEnabled: true,
  },
});

// Model provider options
type ModelProvider = 'volcengine' | 'anthropic' | 'openai' | 'azure-openai';
type ConfigFormat = 'ts' | 'json' | 'yaml';

interface WorkspaceOptions {
  init?: boolean;
  open?: boolean;
  enable?: boolean;
  disable?: boolean;
  status?: boolean;
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
      message:
        'Workspace already exists. Config files will be overwritten, but other files will be preserved. Continue?',
      initialValue: false,
    });

    if (!shouldContinue) {
      p.outro('Workspace initialization cancelled.');
      return;
    }
  } else {
    // Create workspace directory if it doesn't exist
    fs.mkdirSync(workspacePath, { recursive: true });
  }

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
 * Enable global workspace
 */
async function enableGlobalWorkspace(): Promise<void> {
  const workspacePath = path.join(os.homedir(), '.agent-tars-workspace');

  // Check if workspace exists
  if (!fs.existsSync(workspacePath)) {
    console.error(
      boxen(
        chalk.red('ERROR: Global workspace not found!') +
          '\n\n' +
          `Please run ${chalk.blue('agent-tars workspace --init')} first.`,
        {
          padding: 1,
          borderColor: 'red',
          borderStyle: 'round',
        },
      ),
    );
    return;
  }

  configStore.set('globalWorkspaceEnabled', true);

  // Show success message
  console.log(
    boxen(
      `${chalk.green('SUCCESS:')} Global workspace has been enabled!\n\n` +
        `${chalk.gray('Location:')} ${chalk.blue(workspacePath)}\n` +
        `${chalk.gray('Status:')} ${chalk.green('ACTIVE')}`,
      {
        padding: 1,
        borderColor: 'green',
        borderStyle: 'round',
      },
    ),
  );
}

/**
 * Disable global workspace
 */
async function disableGlobalWorkspace(): Promise<void> {
  const workspacePath = path.join(os.homedir(), '.agent-tars-workspace');

  // Check if workspace exists
  if (!fs.existsSync(workspacePath)) {
    console.error(
      boxen(
        chalk.yellow('WARNING: Global workspace directory not found.') +
          '\n\n' +
          `Workspace will be disabled, but you may want to run ${chalk.blue('agent-tars workspace --init')} to recreate it.`,
        {
          padding: 1,
          borderColor: 'yellow',
          borderStyle: 'round',
        },
      ),
    );
  }

  configStore.set('globalWorkspaceEnabled', false);

  // Show success message
  console.log(
    boxen(
      `${chalk.yellow('NOTICE:')} Global workspace has been disabled.\n\n` +
        `${chalk.gray('Location:')} ${chalk.blue(workspacePath)}\n` +
        `${chalk.gray('Status:')} ${chalk.yellow('DISABLED')}\n\n` +
        `You'll need to specify a workspace directory explicitly with ${chalk.blue('--workspace')} when running agent-tars.`,
      {
        padding: 1,
        borderColor: 'yellow',
        borderStyle: 'round',
      },
    ),
  );
}

/**
 * Show current workspace status
 */
async function showWorkspaceStatus(): Promise<void> {
  const workspacePath = getGlobalWorkspacePath();
  const isCreated = isGlobalWorkspaceCreated();
  const isEnabled = isGlobalWorkspaceEnabled();

  // Get workspace status text and color
  const statusText = isEnabled ? 'ENABLED' : 'DISABLED';
  const statusColor = isEnabled ? 'green' : 'yellow';

  // Check if workspace directory exists
  const workspaceExists = fs.existsSync(workspacePath);
  const pathStatusText = workspaceExists ? 'EXISTS' : 'NOT FOUND';
  const pathStatusColor = workspaceExists ? 'green' : 'red';

  // Create box with status information
  const boxContent = [
    `${chalk.bold('Global Workspace Status')}`,
    '',
    `${chalk.gray('Path:')} ${chalk.blue(workspacePath)}  ${chalk[pathStatusColor](`[${pathStatusText}]`)}`,
    `${chalk.gray('Status:')} ${chalk[statusColor](statusText)}`,
    `${chalk.gray('Created:')} ${isCreated ? chalk.green('YES') : chalk.red('NO')}`,
  ].join('\n');

  console.log(
    boxen(boxContent, {
      padding: 1,
      margin: { top: 1, bottom: 1 },
      borderColor: 'blue',
      borderStyle: 'round',
      dimBorder: true,
    }),
  );

  // Show additional help text based on status
  if (!isCreated) {
    console.log(`Run ${chalk.blue('agent-tars workspace --init')} to initialize your workspace.`);
  } else if (!isEnabled) {
    console.log(`Run ${chalk.blue('agent-tars workspace --enable')} to enable the workspace.`);
  } else if (!workspaceExists) {
    console.log(
      `The workspace directory was deleted. Run ${chalk.blue('agent-tars workspace --init')} to recreate it.`,
    );
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
    } else if (options.enable) {
      await enableGlobalWorkspace();
    } else if (options.disable) {
      await disableGlobalWorkspace();
    } else if (options.status) {
      await showWorkspaceStatus();
    } else {
      logger.error('Please specify a command: --init, --open, --enable, --disable, or --status');
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
    .command('workspace', 'Manage Agent TARS global workspace')
    .option('--init', 'Initialize a new workspace')
    .option('--open', 'Open workspace in VSCode')
    .option('--enable', 'Enable global workspace')
    .option('--disable', 'Disable global workspace')
    .option('--status', 'Show current workspace status')
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
 * Check if global workspace is enabled
 */
export function isGlobalWorkspaceEnabled(): boolean {
  return configStore.get('globalWorkspaceEnabled');
}

/**
 * Get global workspace path
 */
export function getGlobalWorkspacePath(): string {
  return path.join(os.homedir(), '.agent-tars-workspace');
}

/**
 * Check if we should enable global workspace
 */
export const shouldUseGlobalWorkspace = isGlobalWorkspaceCreated() && isGlobalWorkspaceEnabled();
