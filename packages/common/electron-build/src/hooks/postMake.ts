/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import type { ForgeHookMap } from '@electron-forge/shared-types';

const artifactRegex = /.*\.(?:exe|dmg|AppImage|zip)$/;
const platformNamesMap = {
  darwin: 'macos',
  linux: 'linux',
  win32: 'windows',
};
const updateYmlMap = {
  darwin_universal: 'latest-mac.yml',
  darwin_x64: 'latest-mac-x64.yml',
  darwin_arm64: 'latest-mac-arm64.yml',
  linux: 'latest-linux.yml',
  win32: 'latest.yml',
};

export const postMake: ForgeHookMap['postMake'] = async (
  _forgeConfig,
  makeResults,
) => {
  const yml: {
    version?: string;
    files: {
      url: string;
      sha512: string;
      size: number;
    }[];
    releaseDate?: string;
  } = {
    version: makeResults[0]?.packageJSON?.version,
    files: [],
  };

  makeResults = makeResults.map((result) => {
    result.artifacts = result.artifacts.map((artifact) => {
      if (artifactRegex.test(artifact)) {
        try {
          const fileData = fs.readFileSync(artifact);
          const hash = crypto
            .createHash('sha512')
            .update(fileData)
            .digest('base64');
          const { size } = fs.statSync(artifact);

          yml.files.push({
            url: path.basename(artifact),
            sha512: hash,
            size,
          });
        } catch {
          console.error(`Failed to hash ${artifact}`);
        }
        return artifact;
      } else {
        return artifact;
      }
    });
    return result;
  });
  yml.releaseDate = new Date().toISOString();

  const firstResult = makeResults[0];
  if (!firstResult?.artifacts?.[0] || !firstResult.platform) {
    throw new Error('Missing required artifact or platform information');
  }

  const ymlKey =
    firstResult.platform === 'darwin'
      ? `${firstResult.platform}_${firstResult.arch}`
      : firstResult.platform;

  const ymlPath = `${path.dirname(firstResult.artifacts[0])}/${
    updateYmlMap[ymlKey as keyof typeof updateYmlMap]
  }`;

  const ymlStr = yaml.dump(yml, {
    lineWidth: -1,
  });
  fs.writeFileSync(ymlPath, ymlStr);
  // write yml to out/
  fs.writeFileSync(
    path.join(
      process.cwd(),
      'out',
      updateYmlMap[ymlKey as keyof typeof updateYmlMap],
    ),
    ymlStr,
  );

  makeResults.push({
    artifacts: [ymlPath],
    platform: makeResults[0].platform,
    arch: makeResults[0].arch,
    packageJSON: makeResults[0].packageJSON,
  });

  return makeResults;
};
