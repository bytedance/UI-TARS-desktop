# @tarko/npm-package-manager

NPM package manager for dynamic Tarko agent loading. This package enables the Tarko CLI to load agents from NPM packages with intelligent resolution strategies.

## Features

- **Smart Package Resolution**: Supports both full package names and shortcut syntax
- **Global Package Store**: Maintains a local cache of installed agent packages
- **Tarko Compliance Validation**: Ensures packages are valid Tarko agents
- **Update Management**: Handles package updates with version control
- **Error Handling**: Provides helpful error messages and suggestions

## Usage

### CLI Integration

The package manager is automatically integrated into the Tarko CLI:

```bash
# Full package names
tarko run @omni-tars/agent
tarko run tarko-my-agent

# Shortcut syntax (resolves to tarko-{name})
tarko run omni-tars  # Resolves to tarko-omni-tars
tarko run github     # Resolves to tarko-github

# Update packages
tarko run my-agent --update

# Use specific tag
tarko run my-agent --tag beta
```

### Programmatic Usage

```typescript
import { TarkoNPMPackageManager } from '@tarko/npm-package-manager';

const packageManager = new TarkoNPMPackageManager();

// Install and create agent implementation
const agentImpl = await packageManager.createAgentImplementation('omni-tars');

// List installed packages
const packages = await packageManager.listInstalledPackages();

// Get package entry point
const entryPoint = await packageManager.getPackageEntry('tarko-omni-tars');
```

## Package Resolution Strategy

1. **Full Package Names**: Used as-is if they contain `/` or start with `@`
   - `@omni-tars/agent` → `@omni-tars/agent`
   - `my-org/agent` → `my-org/agent`

2. **Shortcut Syntax**: Tries `tarko-{name}` first, then falls back to `{name}`
   - `omni-tars` → tries `tarko-omni-tars`, then `omni-tars`
   - `github` → tries `tarko-github`, then `github`

3. **Parallel Resolution**: Both candidates are checked simultaneously for performance

4. **Priority**: `tarko-{name}` has higher priority than `{name}` to avoid collisions

## Package Validation

Packages are validated for Tarko compliance through:

1. **Package Metadata**: Checks for `tarko.agent: true` in package.json
2. **Runtime Validation**: Attempts to load the entry point and verify it exports a valid agent constructor
3. **Interface Compliance**: Ensures the exported constructor implements the required agent interface

## Global Store

Packages are installed to a global store for reuse:

- **Location**: `~/.tarko/packages/`
- **Registry**: `~/.tarko/registry.json`
- **Structure**: `{packageName}/{version}/`

## API Reference

### TarkoNPMPackageManager

#### Methods

- `parseAgentInput(input: string): AgentInputType` - Classify input type
- `resolvePackageName(input: string): Promise<string>` - Resolve package name with fallback
- `installPackage(packageName: string, options?: InstallOptions): Promise<PackageInfo>` - Install package
- `getPackageEntry(packageName: string): Promise<string>` - Get package entry point
- `listInstalledPackages(): Promise<PackageInfo[]>` - List installed packages
- `updatePackage(packageName: string): Promise<PackageInfo>` - Update package
- `createAgentImplementation(packageName: string, options?: InstallOptions): Promise<AgentImplementation>` - Create agent implementation

#### Types

```typescript
interface PackageInfo {
  name: string;
  version: string;
  installedAt: string;
  entryPoint: string;
  tarkoCompliant: boolean;
}

interface InstallOptions {
  tag?: string;
  update?: boolean;
  timeout?: number;
}

type AgentInputType = 'npm-package' | 'local-path' | 'http-url' | 'unknown';
```

### Utility Functions

- `isNPMPackage(input: string): boolean` - Check if input is a valid NPM package name
- `resolveAgentFromNPMInput(input: string, options?: {...}): Promise<AgentImplementation | null>` - Main integration function
- `analyzeAgentInput(input: string): {...}` - Analyze input and provide suggestions

## Error Handling

The package manager provides detailed error messages with suggestions:

```
Failed to resolve NPM agent 'nonexistent': Package 'nonexistent' not found in NPM registry

Did you mean one of these packages?
  - tarko-nonexistent
  - @tarko/nonexistent
```

## Publishing Tarko Agents

To publish a package that works with this system:

1. **Package Name**: Use `tarko-{name}` or `@{scope}/agent` format
2. **Package.json**: Add `"tarko": { "agent": true }`
3. **Entry Point**: Export an agent constructor as default export
4. **Interface**: Implement the `IAgent` interface from `@tarko/agent-interface`

Example package.json:

```json
{
  "name": "tarko-my-agent",
  "version": "1.0.0",
  "main": "dist/index.js",
  "tarko": {
    "agent": true
  },
  "dependencies": {
    "@tarko/agent-interface": "^0.3.0"
  }
}
```

Example agent:

```typescript
import { Agent } from '@tarko/agent-interface';

export default class MyAgent extends Agent {
  // Agent implementation
}
```
