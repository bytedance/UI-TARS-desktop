/**
 * MIT License
 * Copyright (c) 2024 RPate97
 * https://github.com/token-js/token.js/blob/main/LICENSE
 */

/**
 * Development mode for monorepo
 * Watches for file changes and builds packages on demand
 */
import chokidar from 'chokidar';
import * as execa from 'execa';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { loadWorkspacePackages } from '../utils/workspace';
import type { DevOptions, WorkspacePackage } from '../types';

// Manages running build processes
const processes: Record<string, ReturnType<execa.ExecaMethod>> = {};
const pendingMessages: string[] = [];

/**
 * Creates a build process for a package
 */
function createBuildProcess(pkg: WorkspacePackage): void {
  if (processes[pkg.name]) {
    return;
  }

  if (!pkg.packageJson.scripts?.dev) {
    console.log(chalk.yellow(`[${pkg.name}] does not have a dev script.`));
    return;
  }

  console.log(chalk.bold(`[${pkg.name}] starting build process...`));

  const subProcess = execa.execa('npm', ['run', 'dev'], {
    cwd: pkg.dir,
    stdio: 'inherit',
  });
  console.log('111');

  processes[pkg.name] = subProcess;

  subProcess.on('exit', (code) => {
    if (code !== 0) {
      console.log(chalk.yellow(`[${pkg.name}] build process exited with code ${code}`));
    }
    delete processes[pkg.name];
  });
}

/**
 * Watches for file changes in the workspace
 */
function watchWorkspace(packages: WorkspacePackage[], exclude: string[] = []): void {
  const watcher = chokidar.watch(process.cwd(), {
    ignoreInitial: true,
    ignored: [/\/node_modules\//, /\/dist\//, /\/lib\//, /\/esm\//],
  });

  watcher.on('change', (filePath) => {
    const targetPkg = packages.find((pkg) => filePath.startsWith(`${pkg.dir}/src`));

    if (targetPkg && !exclude.includes(targetPkg.name)) {
      createBuildProcess(targetPkg);
    }
  });
}

/**
 * Enables stdin interaction for manual package building
 */
function enableStdinFeature(packages: WorkspacePackage[], exclude: string[] = []): void {
  if (!process.stdin.isTTY) {
    return;
  }

  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  process.stdin.on('data', async (data) => {
    const input = data.toString().trim();

    // List all running processes with 'ps'
    if (input === 'ps') {
      console.log('\nRunning processes:');
      Object.keys(processes).forEach((pkgName) => {
        console.log(`  ${chalk.gray(processes[pkgName].pid?.toString())} ${pkgName}`);
      });
      console.log();
      return;
    }

    pendingMessages.push(input);

    process.nextTick(async () => {
      if (pendingMessages.length !== 1) {
        pendingMessages.length = 0;
        return;
      }

      const command = pendingMessages[0];
      pendingMessages.length = 0;

      // Interactive package selection with 'n'
      if (command === 'n') {
        const availablePackages = packages.filter(
          (pkg) => !processes[pkg.name] && !exclude.includes(pkg.name),
        );

        if (availablePackages.length === 0) {
          console.log(chalk.yellow('No packages available for building'));
          return;
        }

        const { packageName } = await inquirer.prompt([
          {
            type: 'list',
            name: 'packageName',
            message: 'Choose a package to build:',
            choices: availablePackages.map((pkg) => ({
              name: `${pkg.name}`,
              value: pkg.name,
            })),
          },
        ]);

        const selectedPackage = packages.find((pkg) => pkg.name === packageName);
        if (selectedPackage) {
          createBuildProcess(selectedPackage);
        }
      }

      // Direct package selection by name
      const selectedPackage = packages.find(
        (pkg) => pkg.name === command || pkg.name.endsWith(`/${command}`),
      );

      if (selectedPackage) {
        createBuildProcess(selectedPackage);
      }
    });
  });

  // Handle process exit
  const exitHandler = () => {
    Object.keys(processes).forEach((name) => {
      const proc = processes[name];
      if (proc && proc.kill) {
        proc.kill();
        console.log(`Terminated process for ${name}`);
      }
    });
    process.exit();
  };

  process.on('exit', exitHandler);
  process.on('SIGINT', exitHandler);
}

/**
 * Dev command implementation
 */
export async function dev(options: DevOptions = {}): Promise<void> {
  const cwd = options.cwd || process.cwd();
  const exclude = options.exclude || [];

  console.log(chalk.bold('Starting development mode...'));

  try {
    const packages = await loadWorkspacePackages(cwd);

    watchWorkspace(packages, exclude);
    enableStdinFeature(packages, exclude);

    console.log();
    console.log(chalk.cyan('Development mode ready'));
    console.log(
      chalk.gray('Modify code to trigger builds or type "n" to select a package manually'),
    );
    console.log(chalk.gray('Type "ps" to list running processes'));
    console.log();
  } catch (err) {
    console.error('Failed to start development mode:', err);
    throw err;
  }
}
