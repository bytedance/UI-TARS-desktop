import { app, shell, BrowserWindow, ipcMain } from 'electron';
import { mapClientRef } from '@main/mcp/client';
import { join } from 'path';
import { registerIpcMain } from '@ui-tars/electron-ipc/main';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import { ipcRoutes } from './ipcRoutes';
import icon from '../../resources/icon.png?asset';
import MenuBuilder from './menu';
import { logger } from './utils/logger';
import { setupExternalLinks } from './utils/links';
import { ErrorReporter } from './utils/errorReporter';
import { AppUpdater } from './utils/updateApp';

function createWindow(): BrowserWindow {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 10, y: 10 },
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      // Allow local file access
      webSecurity: false,
      allowRunningInsecureContent: false,
      contextIsolation: true,
    },
  });

  mainWindow.webContents.session.webRequest.onHeadersReceived(
    (details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self' 'unsafe-inline' file: data: blob:;",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdn.jsdelivr.net/npm/ https://cdnjs.cloudflare.com;",
            "img-src 'self' file: data: blob:;",
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://fonts.googleapis.com;",
            "font-src 'self' https://cdnjs.cloudflare.com https://fonts.googleapis.com;",
            "worker-src 'self' blob:;",
            "connect-src 'self' https://cdn.jsdelivr.net/npm/ blob:",
          ],
        },
      });
    },
  );

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
    logger.info('Application window is ready and shown');
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  const appUpdater = new AppUpdater(mainWindow);

  // Set up the application menu
  const menuBuilder = new MenuBuilder(mainWindow, appUpdater);
  menuBuilder.buildMenu();

  return mainWindow;
}

const initializeApp = async () => {
  logger.info('Initializing application');

  // Initialize error reporter
  ErrorReporter.init();

  if (process.platform === 'darwin') {
    app.setAccessibilitySupportEnabled(true);
    const { ensurePermissions } = await import('@main/utils/systemPermissions');

    const ensureScreenCapturePermission = ensurePermissions();
    logger.info(
      'Screen capture permission status:',
      ensureScreenCapturePermission,
    );
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  logger.info('Application is ready');

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron');

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  await initializeApp();

  // IPC test
  ipcMain.on('ping', () => {
    logger.info('Received ping event');
    logger.info('pong');
  });
  registerIpcMain(ipcRoutes);

  const mainWindow = createWindow();

  setupExternalLinks(mainWindow);

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', async () => {
  logger.info('All windows closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
  logger.info('mcp cleanup');
  // Deactivate all MCP servers
  await mapClientRef.current?.cleanup().catch((err) => {
    logger.error('Error during cleanup of MCP servers:', err);
  });
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
