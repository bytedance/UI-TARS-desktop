/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { readdirSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path, { resolve } from 'node:path';

import { MakerDMG } from '@electron-forge/maker-dmg';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import type { ForgeConfig } from '@electron-forge/shared-types';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import setLanguages from 'electron-packager-languages';
import { rimraf, rimrafSync } from 'rimraf';

import pkgs from './package.json';

const skipDevDependencies = new Set([
  ...Object.entries(pkgs.devDependencies || {}).map(([name]) => name),
  '.vite',
]);
const keepLanguages = new Set(['en', 'en_GB', 'en-US', 'en_US']);
// const ignorePattern = new RegExp(`^/node_modules/(${[...devDependencies].join("|")})`)

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

  // Skip devDependencies node_modules in the app
  await Promise.all([
    ...(await readdir(buildPath).then((items) =>
      items
        .filter((item) => !appItems.has(item))
        .map((item) => rimraf(path.join(buildPath, item))),
    )),
    ...(await readdir(path.join(buildPath, 'node_modules')).then((items) =>
      items
        .filter((item) => skipDevDependencies.has(item))
        .map((item) => rimraf(path.join(buildPath, 'node_modules', item))),
    )),
  ]);

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
    name: 'UI TARS',
    icon: 'resources/icon',
    asar: {
      // @ts-ignore
      unpack: [
        '**/node_modules/sharp/**/*',
        '**/node_modules/@img/**/*',
        '**/node_modules/@computer-use/mac-screen-capture-permissions/**/*',
      ],
    },
    afterCopy: [
      cleanSources,
      process.platform !== 'win32'
        ? noopAfterCopy
        : setLanguages(Array.from(keepLanguages)),
    ],
    prune: true,
    executableName: 'UI-TARS',
    extraResource: ['./resources/app-update.yml', './resources/report.html'],
    ...(process.env.APPLE_ID &&
    process.env.APPLE_PASSWORD &&
    process.env.APPLE_TEAM_ID
      ? {
          osxSign: {
            keychain: process.env.KEYCHAIN_PATH,
            optionsForFile: () => ({
              entitlements: 'build/entitlements.mac.plist',
            }),
          },
          osxNotarize: {
            appleId: process.env.APPLE_ID,
            appleIdPassword: process.env.APPLE_PASSWORD,
            teamId: process.env.APPLE_TEAM_ID,
          },
        }
      : {}),
  },
  rebuildConfig: {},
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'bytedance',
          name: 'ui-tars-desktop',
        },
        draft: true,
        force: true,
      },
    },
  ],
  makers: [
    new MakerSquirrel({
      name: 'UI-TARS',
      setupIcon: 'resources/icon.ico',
    }),
    // @ts-expect-error - https://github.com/electron/forge/issues/3712
    new MakerDMG({
      overwrite: true,
      background: 'static/dmg-background.png',
      // icon: 'static/dmg-icon.icns',
      iconSize: 160,
      format: 'UDZO',
      additionalDMGOptions: {
        window: {
          size: {
            width: 660,
            height: 400,
          },
        },
      },
      contents: (opts) => [
        {
          x: 180,
          y: 170,
          type: 'file',
          path: opts.appPath,
        },
        {
          x: 480,
          y: 170,
          type: 'link',
          path: '/Applications',
        },
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
};

export default config;
