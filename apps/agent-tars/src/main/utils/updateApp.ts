import { UpdateInfo } from 'builder-util-runtime';
import { app, dialog, BrowserWindow } from 'electron';
import { logger } from '@main/utils/logger';
import {
  AppUpdater as ElectronAppUpdater,
  autoUpdater,
} from 'electron-updater';

export class AppUpdater {
  autoUpdater: ElectronAppUpdater = autoUpdater;

  checkReleaseName(releaseName: string | undefined | null): boolean {
    return Boolean(
      releaseName && /agent[-.\s]?tars/i.test(releaseName.toLowerCase()),
    );
  }

  constructor(mainWindow: BrowserWindow) {
    autoUpdater.logger = logger;
    autoUpdater.autoDownload = false;

    autoUpdater.on('error', (error) => {
      logger.error('Update_Error', error);
      mainWindow.webContents.send('main:error', error);
    });

    autoUpdater.on('update-available', (releaseInfo: UpdateInfo) => {
      logger.info('new version', releaseInfo);
      const appName = releaseInfo?.files?.[0]?.url;

      if (this.checkReleaseName(appName)) {
        mainWindow.webContents.send('app-update-available', releaseInfo);
        autoUpdater.downloadUpdate();
      } else {
        logger.info('Cannot match');
      }
    });

    this.autoUpdater = autoUpdater;

    if (app.isPackaged) {
      // Only check for updates in the packaged version!
      this.autoUpdater.checkForUpdatesAndNotify();
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
    autoUpdater.on('update-available', (info) => {
      logger.info(`New version found: ${info.version}`);
      if (this.checkReleaseName(info?.releaseName)) {
        dialog.showMessageBox({
          type: 'info',
          title: 'Update Available',
          message: `New version ${info.version} available, downloading...`,
        });
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
    autoUpdater.on('update-downloaded', (_) => {
      logger.info('Update downloaded');
      dialog
        .showMessageBox({
          type: 'info',
          title: 'Update Ready',
          message: 'New version has been downloaded. Install now?',
          buttons: ['Install Now', 'Install Later'],
        })
        .then((response) => {
          if (response.response === 0) {
            // User chose "Install Now"
            autoUpdater.quitAndInstall(); // Quit and install update
          }
        });
    });

    // Listen for errors
    autoUpdater.on('error', (error) => {
      logger.error(`Update error: ${error}`);
      dialog.showErrorBox(
        'Update Error',
        `Error checking for updates: ${error.message}`,
      );
    });
  }
}
