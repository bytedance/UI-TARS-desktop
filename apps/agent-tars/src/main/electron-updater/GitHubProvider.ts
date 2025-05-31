import {
  CancellationToken,
  GithubOptions,
  HttpError,
  newError,
  ReleaseNoteInfo,
  UpdateInfo,
  XElement,
} from 'builder-util-runtime';
import * as semver from 'semver';
import { URL } from 'url';
import { AppUpdater, ResolvedUpdateFileInfo } from 'electron-updater';
import {
  getChannelFilename,
  newUrlFromBase,
  extractTagFromGithubDownloadURL,
} from './util';
import {
  parseUpdateInfo,
  resolveFiles,
  ProviderRuntimeOptions,
} from 'electron-updater/out/providers/Provider';
import { BaseGitHubProvider } from 'electron-updater/out/providers/GitHubProvider';

interface GithubUpdateInfo extends UpdateInfo {
  tag: string;
}

export class CustomGitHubProvider extends BaseGitHubProvider<GithubUpdateInfo> {
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

    let tag: string | null = null;
    try {
      const requestOptions = this.createRequestOptions(
        new URL('https://formulae.brew.sh/api/cask/agent-tars.json'),
      );
      const result = JSON.parse(
        (await this.executor.request(requestOptions, cancellationToken)) || '',
      );

      // @ts-ignore
      if (result?.url) {
        // @ts-ignore
        tag = extractTagFromGithubDownloadURL(result.url);
      }
    } catch (e: any) {
      throw newError(
        `Cannot parse releases feed: ${e.stack || e.message}`,
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

    if (result.releaseNotes == null || result.releaseName == null) {
      try {
        const requestOptions = this.createRequestOptions(
          newUrlFromBase(`/repos${this.basePath}/tags/${tag}`, this.baseApiUrl),
        );
        const releaseInfo = JSON.parse(
          (await this.executor.request(requestOptions, cancellationToken)) ||
            '',
        );

        result.releaseName = result.releaseName || releaseInfo.name;
        result.releaseNotes = result.releaseNotes || releaseInfo.body;
      } catch (e: any) {
        console.error('Error fetching release info', e);
        result.releaseName = tag;
        result.releaseNotes = '';
      }
    }
    console.log('result', result);
    return {
      tag: tag,
      ...result,
    };
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
