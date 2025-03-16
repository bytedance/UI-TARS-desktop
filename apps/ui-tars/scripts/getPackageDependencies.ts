import { execSync } from 'node:child_process';

export function getPackageDependencies(pkgName: string): string[] {
  const dependencies = new Set<string>([pkgName]);

  function collectDependencies(packageName: string) {
    try {
      // 使用 pnpm info 命令获取依赖信息
      const output = execSync(
        // 对于第一次调用，直接使用包名；对于依赖项，使用带版本号的包名
        `pnpm info ${packageName} dependencies --json --prefer-offline`,
        {
          encoding: 'utf-8',
        },
      );

      if (!output.trim()) {
        console.debug('[collectDependencies]', packageName, 'no dependencies');
        return;
      }

      let deps = {};
      try {
        const parsed = JSON.parse(output);
        if (!parsed || typeof parsed !== 'object') {
          console.debug(
            '[collectDependencies]',
            packageName,
            'invalid dependencies format',
          );
          return;
        }
        deps = Array.isArray(parsed) ? parsed[0] : parsed;
      } catch {
        console.warn(`Warning: Invalid JSON output for ${packageName}`);
        return;
      }

      console.debug('[collectDependencies]', packageName, deps);

      for (const [dep, version] of Object.entries(deps)) {
        const depWithVersion = `${dep}@${version}`;
        if (!dependencies.has(dep)) {
          dependencies.add(dep);
          // 递归调用时使用带版本号的包名
          collectDependencies(depWithVersion);
        }
      }
    } catch (err) {
      console.warn(
        `Warning: Failed to process dependencies for ${packageName}`,
        err,
      );
    }
  }

  collectDependencies(pkgName);
  return Array.from(dependencies);
}

// 使用示例
// (async () => {
//   const deps = getPackageDependencies('@computer-use/nut-js');
//   console.log('Dependencies:', JSON.stringify(deps, null, 2));
// })();
