/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import Conf from 'conf';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { TARKO_CONSTANTS } from '@tarko/interface';

interface GlobalWorkspaceConfig {
  globalWorkspaceCreated: boolean;
  globalWorkspaceEnabled: boolean;
}

let configStore: Conf<GlobalWorkspaceConfig>;

async function getConfigStore() {
  if (!configStore) {
    const { default: Conf } = await import('conf');
    configStore = new Conf<GlobalWorkspaceConfig>({
      projectName: 'tarko-agent-cli',
      defaults: {
        globalWorkspaceCreated: false,
        globalWorkspaceEnabled: true,
      },
    });
  }

  return configStore;
}

type ModelProvider = 'volcengine' | 'anthropic' | 'openai' | 'azure-openai';

interface GlobalWorkspaceOptions {
  init?: boolean;
  open?: boolean;
  enable?: boolean;
  disable?: boolean;
  status?: boolean;
}

/**
 * Workspace management command handler
 */
export class GlobalWorkspaceCommand {
  private readonly globalWorkspaceDir: string;

  constructor(globalWorkspaceDir?: string) {
    this.globalWorkspaceDir = globalWorkspaceDir || TARKO_CONSTANTS.GLOBAL_WORKSPACE_DIR;
  }

  async execute(options: GlobalWorkspaceOptions): Promise<void> {
    try {
      if (options.init) {
        await this.initWorkspace();
      } else if (options.open) {
        await this.openWorkspace();
      } else if (options.enable) {
        await this.enableGlobalWorkspace();
      } else if (options.disable) {
        await this.disableGlobalWorkspace();
      } else if (options.status) {
        await this.showWorkspaceStatus();
      } else {
        console.error('Please specify a command: --init, --open, --enable, --disable, or --status');
      }
    } catch (err) {
      console.error(
        `Workspace command failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private async initWorkspace(): Promise<void> {
    const workspacePath = path.join(os.homedir(), this.globalWorkspaceDir);

    const p = await import('@clack/prompts');
    const { default: chalk } = await import('chalk');

    p.intro(`${chalk.blue('Tarko')} workspace initialization`);

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
      fs.mkdirSync(workspacePath, { recursive: true });
    }

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
      await this.createConfigFile(workspacePath, configFormat, modelProvider);

      if (initGit) {
        s.message('Initializing git repository...');
        await this.initGitRepo(workspacePath);
      }

      const store = await getConfigStore();
      store.set('globalWorkspaceCreated', true);

      s.stop('Workspace created successfully!');

      p.outro(
        [
          '\n',
          `${chalk.green('✓')} Workspace created at ${chalk.blue(workspacePath)}`,
          `${chalk.green('✓')} Configuration format: ${chalk.blue(configFormat)}`,
          `${chalk.green('✓')} Default model provider: ${chalk.blue(modelProvider)}`,
          `${chalk.green('✓')} To see all configurations, check the official documentation`,
          `${chalk.green('✓')} To open your workspace, run: ${chalk.blue('tarko workspace --open')}`,
        ].join('\n'),
      );
    } catch (error) {
      s.stop('Failed to create workspace');
      p.outro(`${chalk.red('✗')} Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async createConfigFile(
    workspacePath: string,
    format: string,
    provider: ModelProvider,
  ): Promise<void> {
    switch (format) {
      case 'ts':
        await this.createTypeScriptConfig(workspacePath, provider);
        break;
      case 'json':
        await this.createJsonConfig(workspacePath, provider);
        break;
      case 'yaml':
        await this.createYamlConfig(workspacePath, provider);
        break;
    }
  }

  private async createTypeScriptConfig(
    workspacePath: string,
    provider: ModelProvider,
  ): Promise<void> {
    const packageJson = {
      name: 'my-tarko-global-workspace',
      version: '0.1.0',
      private: true,
      dependencies: {
        '@tarko/interface': 'latest',
      },
    };

    fs.writeFileSync(
      path.join(workspacePath, 'package.json'),
      JSON.stringify(packageJson, null, 2),
    );

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

    const configContent = `import { AgentAppConfig } from '@tarko/interface';

/**
 * Tarko Agent Configuration
 * @see {@link https://docs.tarko.dev/config}
 */
const config: AgentAppConfig = {
  model: {
    provider: '${provider}'
  }
};

export default config;
`;

    fs.writeFileSync(path.join(workspacePath, 'tarko.config.ts'), configContent);
    await this.installDependencies(workspacePath);
  }

  private createJsonConfig(workspacePath: string, provider: ModelProvider): void {
    const config = {
      model: {
        provider: provider,
      },
    };

    fs.writeFileSync(
      path.join(workspacePath, 'tarko.config.json'),
      JSON.stringify(config, null, 2),
    );
  }

  private createYamlConfig(workspacePath: string, provider: ModelProvider): void {
    const configContent = `model:
  provider: ${provider}
`;

    fs.writeFileSync(path.join(workspacePath, 'tarko.config.yaml'), configContent);
  }

  private async installDependencies(workspacePath: string): Promise<void> {
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

  private async initGitRepo(workspacePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const git = spawn('git', ['init'], {
        cwd: workspacePath,
        stdio: 'ignore',
        shell: true,
      });

      git.on('close', (code) => {
        if (code === 0) {
          const gitignore = `node_modules/\n.DS_Store\n`;
          fs.writeFileSync(path.join(workspacePath, '.gitignore'), gitignore);
          resolve();
        } else {
          reject(new Error(`git init failed failed with code ${code}`));
        }
      });

      git.on('error', reject);
    });
  }

  private async openWorkspace(): Promise<void> {
    const workspacePath = path.join(os.homedir(), this.globalWorkspaceDir);

    if (!fs.existsSync(workspacePath)) {
      console.error(
        `Workspace not found at ${workspacePath}. Please run 'tarko workspace --init' first.`,
      );
      return;
    }

    const execPromise = promisify(exec);
    try {
      await execPromise('code --version');
      exec(`code "${workspacePath}"`, (error) => {
        if (error) {
          console.error(`Failed to open workspace: ${error.message}`);
        }
      });
      console.log(`Opening workspace at ${workspacePath}`);
    } catch (error) {
      console.warn('VSCode not found. Please install VSCode or manually open the workspace:');
      console.log(`Workspace path: ${workspacePath}`);
    }
  }

  private async enableGlobalWorkspace(): Promise<void> {
    const workspacePath = path.join(os.homedir(), this.globalWorkspaceDir);
    const { default: chalk } = await import('chalk');
    const { default: boxen } = await import('boxen');

    if (!fs.existsSync(workspacePath)) {
      console.error(
        boxen(
          chalk.red('ERROR: Global workspace not found!') +
            '\n\n' +
            `Please run ${chalk.blue('tarko workspace --init')} first.`,
          {
            padding: 1,
            borderColor: 'red',
            borderStyle: 'round',
          },
        ),
      );
      return;
    }

    const store = await getConfigStore();
    store.set('globalWorkspaceEnabled', true);

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

  private async disableGlobalWorkspace(): Promise<void> {
    const workspacePath = path.join(os.homedir(), this.globalWorkspaceDir);
    const { default: chalk } = await import('chalk');
    const { default: boxen } = await import('boxen');

    if (!fs.existsSync(workspacePath)) {
      console.error(
        boxen(
          chalk.yellow('WARNING: Global workspace directory not found.') +
            '\n\n' +
            `Workspace will be disabled, but you may want to run ${chalk.blue('tarko workspace --init')} to recreate it.`,
          {
            padding: 1,
            borderColor: 'yellow',
            borderStyle: 'round',
          },
        ),
      );
    }

    const store = await getConfigStore();
    store.set('globalWorkspaceEnabled', false);

    console.log(
      boxen(
        `${chalk.yellow('NOTICE:')} Global workspace has been disabled.\n\n` +
          `${chalk.gray('Location:')} ${chalk.blue(workspacePath)}\n` +
          `${chalk.gray('Status:')} ${chalk.yellow('DISABLED')}\n\n` +
          `You'll need to specify a workspace directory explicitly with ${chalk.blue('--workspace')} when running the agent.`,
        {
          padding: 1,
          borderColor: 'yellow',
          borderStyle: 'round',
        },
      ),
    );
  }

  private async showWorkspaceStatus(): Promise<void> {
    const workspacePath = this.getGlobalWorkspacePath();
    const isCreated = await this.isGlobalWorkspaceCreated();
    const isEnabled = await this.isGlobalWorkspaceEnabled();
    const { default: chalk } = await import('chalk');
    const { default: boxen } = await import('boxen');

    const statusText = isEnabled ? 'ENABLED' : 'DISABLED';
    const statusColor = isEnabled ? 'green' : 'yellow';

    const workspaceExists = fs.existsSync(workspacePath);
    const pathStatusText = workspaceExists ? 'EXISTS' : 'NOT FOUND';
    const pathStatusColor = workspaceExists ? 'green' : 'red';

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

    if (!isCreated) {
      console.log(`Run ${chalk.blue('tarko workspace --init')} to initialize your workspace.`);
    } else if (!isEnabled) {
      console.log(`Run ${chalk.blue('tarko workspace --enable')} to enable the workspace.`);
    } else if (!workspaceExists) {
      console.log(
        `The workspace directory was deleted. Run ${chalk.blue('tarko workspace --init')} to recreate it.`,
      );
    }
  }

  public async isGlobalWorkspaceCreated(): Promise<boolean> {
    const store = await getConfigStore();
    return store.get('globalWorkspaceCreated');
  }

  public async isGlobalWorkspaceEnabled(): Promise<boolean> {
    const store = await getConfigStore();
    return store.get('globalWorkspaceEnabled');
  }

  public getGlobalWorkspacePath(): string {
    return path.join(os.homedir(), this.globalWorkspaceDir);
  }
}
