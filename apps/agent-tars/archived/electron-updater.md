# Electron Auto-Update Technical Documentation

## Overview

Agent TARS desktop application implements an automatic update system using Electron's `electron-updater` package with a custom GitHub update provider. This document details the architecture, update flow, and implementation specifics of the update system.

## Architecture

The auto-update system consists of several components:

- **AppUpdater**: Main class that orchestrates the update process
- **CustomGitHubProvider**: Custom implementation that extends `BaseGitHubProvider` to handle Agent TARS specific release formats
- **Menu Integration**: Update checking options in the application menu
- **User Notification System**: Dialog and renderer process notifications

### Directory Structure

```
apps/agent-tars/src/main/
├── electron-updater/
│   ├── GitHubProvider.ts  # Custom GitHub provider implementation
│   └── util.ts            # Utility functions for updates
├── utils/
│   └── updateApp.ts       # Main AppUpdater class
└── menu.ts                # Menu integration for updates
```

## Update Flow

1. Application startup:
   - `AppUpdater` is initialized in `main/index.ts`
   - Auto-checks for updates if app is packaged (production)

2. Update check process:
   - `CustomGitHubProvider` fetches release information from Homebrew API
   - Extracts GitHub release tag from the URL
   - Locates matching channel file in release assets
   - Parses update metadata and verifies compatibility

3. Update download:
   - If update is available, notifies the user
   - Downloads update in background when approved
   - Reports download progress

4. Update installation:
   - Once download completes, prompts user to install
   - Can install immediately or defer to next application restart

## CustomGitHubProvider Implementation

The application uses a custom GitHub provider that extends the standard `BaseGitHubProvider` from `electron-updater`:

```typescript
export class CustomGitHubProvider extends BaseGitHubProvider<GithubUpdateInfo> {
  // Overrides standard provider to handle Agent TARS specific release pattern
  async getLatestVersion(): Promise<GithubUpdateInfo> {
    // Fetches from Homebrew API to determine latest version
    const result = JSON.parse(
      (await this.executor.request(requestOptions, cancellationToken)) || '',
    );
    
    // Extracts GitHub release tag from Homebrew data
    tag = extractTagFromGithubDownloadURL(result.url);
    
    // Gets appropriate channel file based on release type
    channelFile = getChannelFilename(channel);
    channelFileUrl = newUrlFromBase(
      this.getBaseDownloadPath(String(tag), channelFile),
      this.baseUrl,
    );
    
    // Fetches update metadata from channel file
    rawData = await fetchData(channel);
    
    // Parses and returns update info
    return {
      tag: tag,
      ...result,
    };
  }
  
  // Other implementation details...
}
```

### Key Features

- **Homebrew Integration**: Uses Homebrew's API to determine the latest release version
- **Channel-Based Updates**: Supports different update channels (latest, beta)
- **Update Metadata**: Parses YAML files to determine update information
- **Release Notes**: Fetches release notes from GitHub API

## AppUpdater Class

The `AppUpdater` class manages the update lifecycle:

```typescript
export class AppUpdater {
  autoUpdater: ElectronAppUpdater = autoUpdater;
  
  constructor(mainWindow: BrowserWindow) {
    // Configure autoUpdater
    autoUpdater.logger = logger;
    autoUpdater.autoDownload = false;
    
    // Set custom update source
    autoUpdater.setFeedURL({
      provider: 'custom' as 'github',
      owner: REPO_OWNER,
      repo: REPO_NAME,
      updateProvider: CustomGitHubProvider,
    });
    
    // Set up event listeners
    autoUpdater.on('error', (error) => {...});
    autoUpdater.on('update-available', (releaseInfo: UpdateInfo) => {...});
    
    // Auto-check for updates if app is packaged
    if (app.isPackaged) {
      this.autoUpdater.checkForUpdatesAndNotify();
    }
  }
  
  // Manual update check method
  checkForUpdates() {
    autoUpdater.checkForUpdates();
    // Set up additional event listeners...
  }
}
```

### Release Name Validation

The AppUpdater includes a validation check to ensure that updates are specific to Agent TARS:

```typescript
checkReleaseName(releaseInfo: UpdateInfo): boolean {
  const releaseName = releaseInfo?.files?.[0]?.url;
  return Boolean(
    releaseName && /agent[-.\s]?tars/i.test(releaseName.toLowerCase()),
  );
}
```

## Update Checking and Notification

### Automatic Check

- Occurs on application startup if the application is packaged
- Uses the CustomGitHubProvider to check for updates
- Sends notification to renderer process if update is available

### Manual Check

- Available through Help menu: "Check for Updates" option
- Shows dialog feedback regardless of result
- Uses the same update checking mechanism as automatic check

### User Notifications

Updates are communicated to users through:

1. Dialog boxes for:
   - Update availability
   - Download completion
   - Error messages

2. Renderer process events:
   - `app-update-available` - Notifies renderer about available update
   - `main:error` - Reports errors to the UI

## Menu Integration

The application's menu includes update-related options:

```typescript
const subMenuHelp: MenuItemConstructorOptions = {
  label: 'Help',
  submenu: [
    // Other menu items...
    {
      label: 'Check for Updates',
      click: () => {
        this.appUpdater.checkForUpdates();
      },
    },
    // Other menu items...
  ],
};
```

## Update Installation

When an update is downloaded, the app prompts the user with a dialog:

```typescript
autoUpdater.on('update-downloaded', (info) => {
  dialog
    .showMessageBox({
      type: 'info',
      title: 'Update Ready',
      message: 'New version has been downloaded. Install now?',
      buttons: ['Install Now', 'Install Later'],
      detail: `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/tag/${tagPrefix}${info.version}`,
    })
    .then((response) => {
      if (response.response === 0) {
        // User chose "Install Now"
        autoUpdater.quitAndInstall(); // Quit and install update
      }
    });
});
```

## Debugging and Troubleshooting

### Logs

The update system uses a logger to record all update-related events:

```typescript
autoUpdater.logger = logger;
```

### Error Handling

Errors during the update process are:
- Logged to the application log file
- Displayed to the user via dialog boxes
- Sent to the renderer process via IPC

## Usage Example

```typescript
// In main process during app initialization
import { AppUpdater } from './utils/updateApp';

// Create main window
const mainWindow = createWindow();

// Initialize the updater
const appUpdater = new AppUpdater(mainWindow);

// Set up the application menu with update options
const menuBuilder = new MenuBuilder(mainWindow, appUpdater);
menuBuilder.buildMenu();
```

## Implementation Considerations

### Security

- Update packages are verified using GitHub's release mechanism
- Updates are only applied from the official repository

### Performance

- Updates are downloaded in the background without blocking UI
- Progress reporting allows for user feedback during large downloads

### User Experience

- Non-intrusive notifications about updates
- Option to defer installation
- Clear feedback during update process
