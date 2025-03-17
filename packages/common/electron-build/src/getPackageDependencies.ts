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

export const getModuleRoot = (cwd: string, pkgName: string): string => {
  const moduleRoot = dirname(
    require.resolve(`${pkgName}/package.json`, {
      paths: [cwd || process.cwd()],
    }),
  );
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
  const dependencies = new Set<{
    name: string;
    path: string;
  }>(pkgNames.map((name) => ({ name, path: getModuleRoot(cwd, name) })));

  for (const pkgName of pkgNames) {
    try {
      const moduleRoot = getModuleRoot(cwd, pkgName);

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
          dependencies.add({
            name: dep.name,
            path: dep.path,
          }),
        );

      // @ts-ignore
      console.log('walker.modules', walker.modules);
    } catch (error) {
      console.warn('error', error);
    }
  }

  return Array.from(dependencies.values());
}
