/**
 * The following code is modified based on
 * https://github.com/electron-userland/electron-builder/blob/master/packages/electron-updater/src/providers/GitHubProvider.ts
 *
 * The MIT License (MIT)
 * Copyright (c) 2015 Loopline Systems
 * https://github.com/electron-userland/electron-builder/blob/master/LICENSE
 */

import {
  CancellationToken,
  GithubOptions,
  HttpError,
  newError,
  parseXml,
  ReleaseNoteInfo,
  UpdateInfo,
  XElement,
} from 'builder-util-runtime';
import * as semver from 'semver';
import { URL } from 'url';
import { BaseGitHubProvider } from 'electron-updater/out/providers/GitHubProvider';
import { AppUpdater, ResolvedUpdateFileInfo } from 'electron-updater';
import { getChannelFilename, newUrlFromBase } from './utils';
import type { ProviderRuntimeOptions } from 'electron-updater/out/providers/Provider';
import {
  parseUpdateInfo,
  resolveFiles,
} from 'electron-updater/out/providers/Provider';

const hrefRegExp = /\/tag\/([^/]+)$/;

interface GithubUpdateInfo extends UpdateInfo {
  tag: string;
}

export class GitHubProvider extends BaseGitHubProvider<GithubUpdateInfo> {
  constructor(
    protected readonly options: GithubOptions,
    private readonly updater: AppUpdater,
    runtimeOptions: ProviderRuntimeOptions,
  ) {
    super(options, 'github.com', runtimeOptions);
  }

  private get channel(): string {
    const result = this.updater.channel || this.options.channel;
    return result == null
      ? this.getDefaultChannelName()
      : this.getCustomChannelName(result);
  }

  async getLatestVersion(): Promise<GithubUpdateInfo> {
    const cancellationToken = new CancellationToken();

    const feedXml: string = (await this.httpRequest(
      newUrlFromBase(`${this.basePath}.atom`, this.baseUrl),
      {
        accept: 'application/xml, application/atom+xml, text/xml, */*',
      },
      cancellationToken,
    ))!;

    const feed = parseXml(feedXml);
    // noinspection TypeScriptValidateJSTypes
    let latestRelease = feed.element(
      'entry',
      false,
      `No published versions on GitHub`,
    );
    let tag: string | null = null;
    try {
      if (this.updater.allowPrerelease) {
        const currentChannel =
          this.updater?.channel ||
          (semver.prerelease(this.updater.currentVersion)?.[0] as string) ||
          null;

        if (currentChannel === null) {
          // noinspection TypeScriptValidateJSTypes
          tag = hrefRegExp.exec(
            latestRelease.element('link').attribute('href'),
          )![1];
        } else {
          for (const element of feed.getElements('entry')) {
            // noinspection TypeScriptValidateJSTypes
            const hrefElement = hrefRegExp.exec(
              element.element('link').attribute('href'),
            )!;

            // If this is null then something is wrong and skip this release
            if (hrefElement === null) continue;

            // This Release's Tag
            const hrefTag = hrefElement[1];
            //Get Channel from this release's tag
            const hrefChannel =
              (semver.prerelease(hrefTag)?.[0] as string) || null;

            const shouldFetchVersion =
              !currentChannel || ['alpha', 'beta'].includes(currentChannel);
            const isCustomChannel =
              hrefChannel !== null &&
              !['alpha', 'beta'].includes(String(hrefChannel));
            // Allow moving from alpha to beta but not down
            const channelMismatch =
              currentChannel === 'beta' && hrefChannel === 'alpha';

            if (shouldFetchVersion && !isCustomChannel && !channelMismatch) {
              tag = hrefTag;
              break;
            }

            const isNextPreRelease =
              hrefChannel && hrefChannel === currentChannel;
            if (isNextPreRelease) {
              tag = hrefTag;
              break;
            }
          }
        }
      } else {
        tag = await this.getLatestTagName(cancellationToken);
        for (const element of feed.getElements('entry')) {
          // noinspection TypeScriptValidateJSTypes
          if (
            hrefRegExp.exec(element.element('link').attribute('href'))![1] ===
            tag
          ) {
            latestRelease = element;
            break;
          }
        }
      }
    } catch (e: any) {
      throw newError(
        `Cannot parse releases feed: ${e.stack || e.message},\nXML:\n${feedXml}`,
        'ERR_UPDATER_INVALID_RELEASE_FEED',
      );
    }

    if (tag == null) {
      throw newError(
        `No published versions on GitHub`,
        'ERR_UPDATER_NO_PUBLISHED_VERSIONS',
      );
    }

    let rawData: string;
    let channelFile = '';
    let channelFileUrl: any = '';
    const fetchData = async (channelName: string) => {
      channelFile = getChannelFilename(channelName);
      channelFileUrl = newUrlFromBase(
        this.getBaseDownloadPath(String(tag), channelFile),
        this.baseUrl,
      );
      const requestOptions = this.createRequestOptions(channelFileUrl);
      try {
        return (await this.executor.request(
          requestOptions,
          cancellationToken,
        ))!;
      } catch (e: any) {
        if (e instanceof HttpError && e.statusCode === 404) {
          throw newError(
            `Cannot find ${channelFile} in the latest release artifacts (${channelFileUrl}): ${e.stack || e.message}`,
            'ERR_UPDATER_CHANNEL_FILE_NOT_FOUND',
          );
        }
        throw e;
      }
    };

    try {
      let channel = this.channel;
      if (this.updater.allowPrerelease && semver.prerelease(tag)?.[0]) {
        channel = this.getCustomChannelName(
          String(semver.prerelease(tag)?.[0]),
        );
      }
      rawData = await fetchData(channel);
    } catch (e: any) {
      if (this.updater.allowPrerelease) {
        // Allow fallback to `latest.yml`
        rawData = await fetchData(this.getDefaultChannelName());
      } else {
        throw e;
      }
    }

    const result = parseUpdateInfo(rawData, channelFile, channelFileUrl);
    if (result.releaseName == null) {
      result.releaseName = latestRelease.elementValueOrEmpty('title');
    }

    if (result.releaseNotes == null) {
      result.releaseNotes = computeReleaseNotes(
        this.updater.currentVersion,
        this.updater.fullChangelog,
        feed,
        latestRelease,
      );
    }
    return {
      tag: tag,
      ...result,
    };
  }

  private async getLatestTagName(
    cancellationToken: CancellationToken,
  ): Promise<string | null> {
    const options = this.options;
    // do not use API for GitHub to avoid limit, only for custom host or GitHub Enterprise
    const url =
      options.host == null || options.host === 'github.com'
        ? newUrlFromBase(`${this.basePath}/latest`, this.baseUrl)
        : new URL(
            `${this.computeGithubBasePath(`/repos/${options.owner}/${options.repo}/releases`)}/latest`,
            this.baseApiUrl,
          );
    try {
      const rawData = await this.httpRequest(
        url,
        { Accept: 'application/json' },
        cancellationToken,
      );
      if (rawData == null) {
        return null;
      }

      const releaseInfo: GithubReleaseInfo = JSON.parse(rawData);
      return releaseInfo.tag_name;
    } catch (e: any) {
      throw newError(
        `Unable to find latest version on GitHub (${url}), please ensure a production release exists: ${e.stack || e.message}`,
        'ERR_UPDATER_LATEST_VERSION_NOT_FOUND',
      );
    }
  }

  private get basePath(): string {
    return `/${this.options.owner}/${this.options.repo}/releases`;
  }

  resolveFiles(updateInfo: GithubUpdateInfo): Array<ResolvedUpdateFileInfo> {
    // still replace space to - due to backward compatibility
    return resolveFiles(updateInfo, this.baseUrl, (p) =>
      this.getBaseDownloadPath(updateInfo.tag, p.replace(/ /g, '-')),
    );
  }

  private getBaseDownloadPath(tag: string, fileName: string): string {
    return `${this.basePath}/download/${tag}/${fileName}`;
  }
}

interface GithubReleaseInfo {
  readonly tag_name: string;
}

function getNoteValue(parent: XElement): string {
  const result = parent.elementValueOrEmpty('content');
  // GitHub reports empty notes as <content>No content.</content>
  return result === 'No content.' ? '' : result;
}

export function computeReleaseNotes(
  currentVersion: semver.SemVer,
  isFullChangelog: boolean,
  feed: XElement,
  latestRelease: any,
): string | Array<ReleaseNoteInfo> | null {
  if (!isFullChangelog) {
    return getNoteValue(latestRelease);
  }

  const releaseNotes: Array<ReleaseNoteInfo> = [];
  for (const release of feed.getElements('entry')) {
    // noinspection TypeScriptValidateJSTypes
    const versionRelease = /\/tag\/v?([^/]+)$/.exec(
      release.element('link').attribute('href'),
    )![1];
    if (semver.lt(currentVersion, versionRelease)) {
      releaseNotes.push({
        version: versionRelease,
        note: getNoteValue(release),
      });
    }
  }
  return releaseNotes.sort((a, b) => semver.rcompare(a.version, b.version));
}
