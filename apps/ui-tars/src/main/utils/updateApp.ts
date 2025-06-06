import { UpdateInfo } from 'builder-util-runtime';
import { app, dialog, BrowserWindow } from 'electron';
import { logger } from '@main/logger';
import {
  AppUpdater as ElectronAppUpdater,
  autoUpdater,
} from 'electron-updater';
import { CustomGitHubProvider } from '@main/electron-updater/GitHubProvider';
import { env } from 'node:process';
import { REPO_OWNER, REPO_NAME } from '@main/shared/constants';

export class AppUpdater {
  autoUpdater: ElectronAppUpdater = autoUpdater;

  checkReleaseName(releaseInfo: UpdateInfo): boolean {
    const releaseName = releaseInfo?.files?.[0]?.url;

    return Boolean(
      releaseName && /ui[-.\s]?tars/i.test(releaseName.toLowerCase()),
    );
  }

  constructor(mainWindow: BrowserWindow) {
    autoUpdater.logger = logger;
    autoUpdater.autoDownload = false;

    autoUpdater.setFeedURL({
      // hack for custom provider
      provider: 'custom' as 'github',
      owner: REPO_OWNER,
      repo: REPO_NAME,
      // @ts-expect-error hack for custom provider
      updateProvider: CustomGitHubProvider,
    });

    autoUpdater.on('error', (error) => {
      logger.error('Update_Error', error);
      mainWindow.webContents.send('main:error', error);
    });

    autoUpdater.on('update-available', (releaseInfo: UpdateInfo) => {
      logger.info('new version', releaseInfo);

      if (this.checkReleaseName(releaseInfo)) {
        mainWindow.webContents.send('app-update-available', releaseInfo);
        autoUpdater.downloadUpdate();
      } else {
        logger.info('Cannot match');
      }
    });

    // Listen for download progress (optional)
    autoUpdater.on('download-progress', (progressObj) => {
      const logMessage = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}%`;
      logger.info(logMessage);
    });

    // Listen for update download completion
    autoUpdater.on('update-downloaded', (info) => {
      logger.info('Update downloaded');
      dialog
        .showMessageBox({
          type: 'info',
          title: 'Update Ready',
          message: 'New version has been downloaded. Install now?',
          buttons: ['Install Now', 'Install Later'],
          detail: `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/tag/v${info.version}`,
        })
        .then((response) => {
          if (response.response === 0) {
            // User chose "Install Now"
            autoUpdater.quitAndInstall(); // Quit and install update
          }
        });
    });

    this.autoUpdater = autoUpdater;

    if (app.isPackaged) {
      // Only check for updates in the packaged version!
      this.autoUpdater.checkForUpdatesAndNotify();
      // }
    }
  }

  async checkForUpdatesDetail() {
    if (env.isWindows && 'PORTABLE_EXECUTABLE_DIR' in process.env) {
      return {
        currentVersion: app.getVersion(),
        updateInfo: null,
      };
    }

    try {
      const update = await this.autoUpdater.checkForUpdates();
      if (
        update?.isUpdateAvailable &&
        update?.updateInfo &&
        this.checkReleaseName(update.updateInfo)
      ) {
        this.autoUpdater.downloadUpdate();
      }

      return {
        currentVersion: this.autoUpdater.currentVersion.toString(),
        updateInfo: update?.updateInfo,
      };
    } catch (error) {
      logger.error('Failed to check for update:', error);
      return {
        currentVersion: app.getVersion(),
        updateInfo: null,
      };
    }
  }

  // Function to manually check for updates
  checkForUpdates() {
    autoUpdater.checkForUpdates();

    // Listen for update check start
    autoUpdater.on('checking-for-update', () => {
      logger.info('Checking for updates...');
    });

    // Listen for no available updates
    autoUpdater.on('update-not-available', (_) => {
      logger.info('No updates available.');
      dialog.showMessageBox({
        type: 'info',
        title: 'Update Check',
        message: 'You are using the latest version. No updates needed.',
      });
    });

    // Listen for available updates
    autoUpdater.on('update-available', (info: UpdateInfo) => {
      logger.info(`New version found: ${info.version}`);
      if (this.checkReleaseName(info)) {
        dialog.showMessageBox({
          type: 'info',
          title: 'Update Available',
          message: `New version ${info.version} available, downloading...`,
          detail: `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/tag/v${info.version}`,
        });
        autoUpdater.downloadUpdate();
      } else {
        logger.info('Cannot match');
      }
    });
  }
}
