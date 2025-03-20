/**
 * The following code is modified based on
 * https://github.com/timfish/forge-externals-plugin/blob/master/index.js
 *
 * MIT License
 * Copyright (c) 2021 Tim Fish
 * https://github.com/timfish/forge-externals-plugin/blob/master/LICENSE
 */
import { Walker, DepType } from 'flora-colossus';
import { dirname } from 'path';
import { findUpSync } from './findUp';

export const getModuleRoot = (cwd: string, pkgName: string): string => {
  let moduleEntryPath;
  try {
    moduleEntryPath = dirname(
      require.resolve(`${pkgName}/package.json`, {
        paths: [cwd || process.cwd()],
      }),
    );
  } catch (error) {
    moduleEntryPath = dirname(
      require.resolve(pkgName, {
        paths: [cwd || process.cwd()],
      }),
    );
    console.warn(
      'Failed to read package.json:',
      error,
      'new_entry_path',
      moduleEntryPath,
    );
  }
  let pkgPath = findUpSync('package.json', {
    cwd: moduleEntryPath,
  });

  if (!pkgPath) {
    return '';
  }

  let currentDir = dirname(pkgPath);
  let isMatched = false;

  while (pkgPath && !isMatched) {
    try {
      const pkg = require(pkgPath);
      if (pkg.name === pkgName) {
        isMatched = true;
        break;
      }

      currentDir = dirname(currentDir);
      pkgPath = findUpSync('package.json', {
        cwd: currentDir,
      });
    } catch (err) {
      console.warn('Failed to read package.json:', err);
      break;
    }
  }

  if (!isMatched || !pkgPath) {
    return '';
  }

  const moduleRoot = dirname(pkgPath);
  return moduleRoot;
};

export async function getExternalPkgsDependencies(
  pkgNames: string[],
  cwd: string = process.cwd(),
): Promise<
  {
    name: string;
    path: string;
  }[]
> {
  const dependenciesMap = new Map<string, { name: string; path: string }>();
  pkgNames.forEach((name) => {
    dependenciesMap.set(name, { name, path: getModuleRoot(cwd, name) });
  });

  for (const pkgName of pkgNames) {
    try {
      const moduleRoot = getModuleRoot(cwd, pkgName);
      // console.log('moduleRoot', moduleRoot);

      const walker = new Walker(moduleRoot);
      // These are private so it's quite nasty!
      // @ts-ignore
      walker.modules = [];
      // @ts-ignore
      await walker.walkDependenciesForModule(moduleRoot, DepType.PROD);
      // @ts-ignore
      walker.modules
        .filter((dep: any) => dep.nativeModuleType === DepType.PROD)
        .forEach((dep: any) =>
          dependenciesMap.set(dep.name, {
            name: dep.name,
            path: dep.path,
          }),
        );

      // @ts-ignore
      // console.log('walker.modules', walker.modules);
    } catch (error) {
      console.warn('error', error);
    }
  }

  return Array.from(dependenciesMap.values());
}
