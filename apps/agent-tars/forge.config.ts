import fs, { readdirSync } from 'node:fs';
import { cp, readdir } from 'node:fs/promises';
import path, { resolve } from 'node:path';
import { MakerDMG } from '@electron-forge/maker-dmg';
import { MakerZIP } from '@electron-forge/maker-zip';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import type { ForgeConfig } from '@electron-forge/shared-types';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import setLanguages from 'electron-packager-languages';
import { rimraf, rimrafSync } from 'rimraf';
import {
  getModuleRoot,
  getExternalPkgsDependencies,
  hooks,
} from '@common/electron-build';

import pkg from './package.json';

const projectRoot = path.resolve(__dirname, '.');

const keepModules = new Set([
  ...Object.keys(pkg.dependencies),
  '@mixmark-io/domino',
  '@modelcontextprotocol/sdk',
]);
const needSubDependencies = [
  '@tavily/core',
  '@modelcontextprotocol/sdk',
  '@computer-use/node-mac-permissions',
];
const keepLanguages = new Set(['en', 'en_GB', 'en-US', 'en_US']);
const ignorePattern = new RegExp(
  `^/node_modules/(?!${[...keepModules].join('|')})`,
);

console.log('keepModules', keepModules);
console.log('needSubDependencies', needSubDependencies);
console.log('ignorePattern', ignorePattern);

const enableOsxSign =
  process.env.APPLE_ID &&
  process.env.APPLE_PASSWORD &&
  process.env.APPLE_TEAM_ID;

// remove folders & files not to be included in the app
async function cleanSources(
  buildPath,
  _electronVersion,
  platform,
  _arch,
  callback,
) {
  // folders & files to be included in the app
  const appItems = new Set([
    'dist',
    'node_modules',
    'package.json',
    'resources',
  ]);

  console.log('buildPath', buildPath);

  if (platform === 'darwin') {
    const frameworkResourcePath = resolve(
      buildPath,
      '../../Frameworks/Electron Framework.framework/Versions/A/Resources',
    );

    for (const file of readdirSync(frameworkResourcePath)) {
      if (file.endsWith('.lproj') && !keepLanguages.has(file.split('.')[0])) {
        rimrafSync(resolve(frameworkResourcePath, file));
      }
    }
  }

  // Keep only node_modules to be included in the app
  await Promise.all([
    ...(await readdir(buildPath).then((items) =>
      items
        .filter((item) => !appItems.has(item))
        .map((item) => rimraf(path.join(buildPath, item))),
    )),
    ...(await readdir(path.join(buildPath, 'node_modules')).then((items) =>
      items
        .filter((item) => !keepModules.has(item))
        .map((item) => rimraf(path.join(buildPath, 'node_modules', item))),
    )),
  ]);

  await Promise.all(
    Array.from(keepModules.values()).map((item) => {
      // Check is exist
      if (fs.existsSync(path.join(buildPath, 'node_modules', item))) {
        // eslint-disable-next-line array-callback-return
        return;
      }

      try {
        const moduleRoot = getModuleRoot(projectRoot, item);

        if (fs.existsSync(moduleRoot)) {
          // console.log('copy_current_node_modules', moduleRoot);
          return cp(moduleRoot, path.join(buildPath, 'node_modules', item), {
            recursive: true,
          });
        }
      } catch (error) {
        console.error('copy_current_node_modules_error', error);
        return;
      }

      return;
    }),
  );

  const subDependencies = await getExternalPkgsDependencies(
    needSubDependencies,
    projectRoot,
  );
  console.log('subDependencies', subDependencies);
  await Promise.all(
    subDependencies.map((subDependency) => {
      const targetDir = path.join(
        buildPath,
        'node_modules',
        subDependency.name,
      );
      const sourceDir = subDependency.path;
      if (!fs.existsSync(targetDir) && fs.existsSync(sourceDir)) {
        try {
          return cp(sourceDir, targetDir, {
            recursive: true,
          });
        } catch (e) {
          console.error('copy_current_node_modules_error', sourceDir, e);
        }
      }
      return;
    }),
  );

  callback();
}

const noopAfterCopy = (
  _buildPath,
  _electronVersion,
  _platform,
  _arch,
  callback,
) => callback();

const config: ForgeConfig = {
  packagerConfig: {
    // appBundleId: 'com.bytedance.uitars',
    name: 'Agent TARS',
    icon: 'resources/icon',
    extraResource: ['./resources/app-update.yml'],
    asar: true,
    ignore: [ignorePattern],
    prune: false,
    afterCopy: [
      cleanSources,
      process.platform !== 'win32'
        ? noopAfterCopy
        : setLanguages(Array.from(keepLanguages)),
    ],
    executableName: 'Agent-TARS',
    ...(enableOsxSign
      ? {
          osxSign: {
            keychain: process.env.KEYCHAIN_PATH,
            optionsForFile: () => ({
              entitlements: 'build/entitlements.mac.plist',
            }),
          },
          osxNotarize: {
            appleId: process.env.APPLE_ID!,
            appleIdPassword: process.env.APPLE_PASSWORD!,
            teamId: process.env.APPLE_TEAM_ID!,
          },
        }
      : {}),
  },
  rebuildConfig: {},
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: { owner: 'bytedance', name: 'UI-TARS-desktop' },
        draft: true,
        force: true,
        generateReleaseNotes: true,
        tagPrefix: 'Agent-TARS-v',
      },
    },
  ],
  makers: [
    new MakerZIP({}, ['darwin']),
    // https://github.com/electron/forge/issues/3712
    new MakerDMG({
      overwrite: true,
      background: 'static/dmg-background.png',
      // icon: 'static/dmg-icon.icns',
      iconSize: 160,
      format: 'UDZO',
      additionalDMGOptions: { window: { size: { width: 660, height: 400 } } },
      contents: (opts) => [
        { x: 180, y: 170, type: 'file', path: opts.appPath },
        { x: 480, y: 170, type: 'link', path: '/Applications' },
      ],
    }),
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    // https://github.com/microsoft/playwright/issues/28669#issuecomment-2268380066
    ...(process.env.CI === 'e2e'
      ? []
      : [
          new FusesPlugin({
            version: FuseVersion.V1,
            [FuseV1Options.RunAsNode]: false,
            [FuseV1Options.EnableCookieEncryption]: true,
            [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
            [FuseV1Options.EnableNodeCliInspectArguments]: false,
            [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
            [FuseV1Options.OnlyLoadAppFromAsar]: true,
          }),
        ]),
  ],
  hooks: {
    postMake: async (forgeConfig, makeResults) => {
      return await hooks.postMake?.(forgeConfig, makeResults);
    },
  },
};

export default config;
