/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import fetch from 'node-fetch';
import * as tar from 'tar';
import * as semver from 'semver';
import { AgentImplementation } from '@tarko/interface';

/**
 * Package information stored in local registry
 */
export interface PackageInfo {
  name: string;
  version: string;
  installedAt: string;
  entryPoint: string;
  tarkoCompliant: boolean;
}

/**
 * Installation options
 */
export interface InstallOptions {
  tag?: string;
  update?: boolean;
  timeout?: number;
}

/**
 * Agent input type classification
 */
export type AgentInputType = 'npm-package' | 'local-path' | 'http-url' | 'unknown';

/**
 * NPM registry response for package metadata
 */
interface NPMPackageMetadata {
  name: string;
  'dist-tags': { [tag: string]: string };
  versions: {
    [version: string]: {
      name: string;
      version: string;
      main?: string;
      module?: string;
      types?: string;
      exports?: any;
      dist: {
        tarball: string;
        shasum: string;
      };
      tarko?: {
        agent?: boolean;
      };
    };
  };
}

/**
 * TarkoNPMPackageManager handles dynamic loading of Tarko agents from NPM packages
 */
export class TarkoNPMPackageManager {
  private readonly globalStoreDir: string;
  private readonly registryPath: string;
  private readonly npmRegistry: string;

  constructor(options?: { globalStoreDir?: string; npmRegistry?: string }) {
    this.globalStoreDir = options?.globalStoreDir || path.join(os.homedir(), '.tarko', 'packages');
    this.registryPath = path.join(path.dirname(this.globalStoreDir), 'registry.json');
    this.npmRegistry = options?.npmRegistry || 'https://registry.npmjs.org';
  }

  /**
   * Parse user input and determine resolution strategy
   */
  parseAgentInput(input: string): AgentInputType {
    // HTTP URL
    if (input.startsWith('http://') || input.startsWith('https://')) {
      return 'http-url';
    }

    // Local path (relative or absolute)
    if (input.startsWith('./') || input.startsWith('../') || input.startsWith('/') || input.includes(path.sep)) {
      return 'local-path';
    }

    // NPM package pattern: @scope/package or package-name
    if (/^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(input)) {
      return 'npm-package';
    }

    return 'unknown';
  }

  /**
   * Resolve package name with fallback strategy
   * For shortcut syntax: 'omni-tars' → try 'tarko-omni-tars' then 'omni-tars'
   */
  async resolvePackageName(input: string): Promise<string> {
    // If input already contains '/' or starts with '@', use as-is (full package name)
    if (input.includes('/') || input.startsWith('@')) {
      await this.validatePackageExists(input);
      return input;
    }

    // Try shortcut resolution: tarko-{input} first, then {input}
    const tarkoPackageName = `tarko-${input}`;
    
    try {
      await this.validatePackageExists(tarkoPackageName);
      return tarkoPackageName;
    } catch {
      // Fallback to original name
      await this.validatePackageExists(input);
      return input;
    }
  }

  /**
   * Validate that a package exists in NPM registry
   */
  private async validatePackageExists(packageName: string): Promise<void> {
    const response = await fetch(`${this.npmRegistry}/${packageName}`, {
      method: 'HEAD',
      timeout: 5000,
    });

    if (!response.ok) {
      throw new Error(`Package '${packageName}' not found in NPM registry`);
    }
  }

  /**
   * Download and install package to global store
   */
  async installPackage(packageName: string, options: InstallOptions = {}): Promise<PackageInfo> {
    const resolvedPackageName = await this.resolvePackageName(packageName);
    const tag = options.tag || 'latest';
    
    // Check if already installed and not updating
    if (!options.update) {
      const existingPackage = await this.getInstalledPackage(resolvedPackageName);
      if (existingPackage) {
        return existingPackage;
      }
    }

    // Fetch package metadata
    const metadata = await this.fetchPackageMetadata(resolvedPackageName);
    const version = metadata['dist-tags'][tag];
    
    if (!version) {
      throw new Error(`Tag '${tag}' not found for package '${resolvedPackageName}'`);
    }

    const versionInfo = metadata.versions[version];
    if (!versionInfo) {
      throw new Error(`Version '${version}' not found for package '${resolvedPackageName}'`);
    }

    // Download and extract package
    const packageDir = path.join(this.globalStoreDir, resolvedPackageName, version);
    await fs.mkdir(packageDir, { recursive: true });

    await this.downloadAndExtract(versionInfo.dist.tarball, packageDir);

    // Determine entry point
    const entryPoint = this.resolveEntryPoint(packageDir, versionInfo);
    
    // Validate Tarko compliance
    const tarkoCompliant = await this.validateTarkoCompliance(packageDir, versionInfo);

    const packageInfo: PackageInfo = {
      name: resolvedPackageName,
      version,
      installedAt: new Date().toISOString(),
      entryPoint,
      tarkoCompliant,
    };

    // Update local registry
    await this.updateLocalRegistry(packageInfo);

    return packageInfo;
  }

  /**
   * Get package entry point for consumption
   */
  async getPackageEntry(packageName: string): Promise<string> {
    const resolvedPackageName = await this.resolvePackageName(packageName);
    const packageInfo = await this.getInstalledPackage(resolvedPackageName);
    
    if (!packageInfo) {
      throw new Error(`Package '${resolvedPackageName}' is not installed. Run install first.`);
    }

    if (!packageInfo.tarkoCompliant) {
      throw new Error(`Package '${resolvedPackageName}' is not a valid Tarko agent package`);
    }

    return packageInfo.entryPoint;
  }

  /**
   * List all installed packages
   */
  async listInstalledPackages(): Promise<PackageInfo[]> {
    try {
      const registryData = await fs.readFile(this.registryPath, 'utf-8');
      const registry = JSON.parse(registryData);
      return Object.values(registry.packages || {}) as PackageInfo[];
    } catch {
      return [];
    }
  }

  /**
   * Update a specific package
   */
  async updatePackage(packageName: string): Promise<PackageInfo> {
    return this.installPackage(packageName, { update: true });
  }

  /**
   * Create AgentImplementation from NPM package
   */
  async createAgentImplementation(packageName: string, options: InstallOptions = {}): Promise<AgentImplementation> {
    const packageInfo = await this.installPackage(packageName, options);
    
    return {
      type: 'modulePath',
      label: `${packageInfo.name}@${packageInfo.version}`,
      value: packageInfo.entryPoint,
    };
  }

  // Private helper methods

  private async fetchPackageMetadata(packageName: string): Promise<NPMPackageMetadata> {
    const response = await fetch(`${this.npmRegistry}/${packageName}`, {
      timeout: 10000,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch metadata for package '${packageName}': ${response.statusText}`);
    }

    return response.json() as Promise<NPMPackageMetadata>;
  }

  private async downloadAndExtract(tarballUrl: string, targetDir: string): Promise<void> {
    const response = await fetch(tarballUrl, { timeout: 30000 });
    
    if (!response.ok) {
      throw new Error(`Failed to download package: ${response.statusText}`);
    }

    // Extract tarball to target directory
    await tar.extract({
      file: undefined,
      cwd: targetDir,
      strip: 1, // Remove the top-level package directory
    }, []);

    // Pipe the response to tar extractor
    if (response.body) {
      const stream = tar.extract({
        cwd: targetDir,
        strip: 1,
      });
      
      response.body.pipe(stream);
      
      await new Promise((resolve, reject) => {
        stream.on('end', resolve);
        stream.on('error', reject);
      });
    }
  }

  private resolveEntryPoint(packageDir: string, versionInfo: any): string {
    // Try exports field first (modern packages)
    if (versionInfo.exports && versionInfo.exports['.']) {
      const exportEntry = versionInfo.exports['.'];
      if (typeof exportEntry === 'string') {
        return path.resolve(packageDir, exportEntry);
      }
      if (exportEntry.require) {
        return path.resolve(packageDir, exportEntry.require);
      }
      if (exportEntry.import) {
        return path.resolve(packageDir, exportEntry.import);
      }
    }

    // Fallback to main field
    const mainFile = versionInfo.main || 'index.js';
    return path.resolve(packageDir, mainFile);
  }

  private async validateTarkoCompliance(packageDir: string, versionInfo: any): Promise<boolean> {
    // Check package.json for tarko field
    if (versionInfo.tarko?.agent === true) {
      return true;
    }

    // Try to load the entry point and check if it exports a valid agent
    try {
      const entryPoint = this.resolveEntryPoint(packageDir, versionInfo);
      const agentModule = await import(entryPoint);
      
      // Check if it has a default export that looks like an agent constructor
      const AgentConstructor = agentModule.default;
      return typeof AgentConstructor === 'function';
    } catch {
      return false;
    }
  }

  private async getInstalledPackage(packageName: string): Promise<PackageInfo | null> {
    try {
      const registryData = await fs.readFile(this.registryPath, 'utf-8');
      const registry = JSON.parse(registryData);
      return registry.packages?.[packageName] || null;
    } catch {
      return null;
    }
  }

  private async updateLocalRegistry(packageInfo: PackageInfo): Promise<void> {
    await fs.mkdir(path.dirname(this.registryPath), { recursive: true });
    
    let registry: any = { packages: {} };
    
    try {
      const registryData = await fs.readFile(this.registryPath, 'utf-8');
      registry = JSON.parse(registryData);
    } catch {
      // File doesn't exist or is invalid, use default
    }

    registry.packages = registry.packages || {};
    registry.packages[packageInfo.name] = packageInfo;
    registry.lastUpdated = new Date().toISOString();

    await fs.writeFile(this.registryPath, JSON.stringify(registry, null, 2));
  }
}
