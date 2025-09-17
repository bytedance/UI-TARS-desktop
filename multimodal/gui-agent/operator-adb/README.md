# Adb Operator

## Overview

Adb Operator is an Android operator based on [ADB](https://developer.android.com/studio/command-line/adb) for GUI Agent. It provides a set of APIs to interact with Android devices, including taking screenshots, touch operations, keyboard operations, and more.

## Installation

```bash
npm install @gui-agent/operator-adb
```

Or with yarn:

```bash
yarn add @gui-agent/operator-adb
```

Or with pnpm:

```bash
pnpm add @gui-agent/operator-adb
```

## Features

- **Screenshot Capture**: Take screenshots of Android devices, with fallback mechanisms to handle restricted apps
- **Touch Interactions**: Simulate tap, swipe, and long-press gestures
- **Keyboard Input**: Send text and key events to Android devices
- **Screen Context**: Get device screen information including resolution and pixel density
- **Multi-device Support**: Connect to and control multiple Android devices

## Usage

```typescript
import { AdbOperator } from '@gui-agent/operator-adb';
import { ConsoleLogger, LogLevel } from '@agent-infra/logger';

// Create a logger
const logger = new ConsoleLogger(undefined, LogLevel.DEBUG);

// Create an operator instance
const operator = new AdbOperator(logger);

// Initialize the operator
await operator.initialize();

// Take a screenshot
const screenshot = await operator.doScreenshot();
console.log('Screenshot taken:', screenshot.status);

// Execute actions
const result = await operator.doExecute({
  actions: [
    {
      type: 'click',
      x: 500,
      y: 300
    },
    {
      type: 'type',
      text: 'Hello, World!'
    }
  ]
});
```

## API Reference

### `AdbOperator`

The main class that provides methods to interact with Android devices.

#### Constructor

```typescript
constructor(logger: ConsoleLogger = defaultLogger)
```

- `logger`: A ConsoleLogger instance for logging. Default is a ConsoleLogger with LogLevel.DEBUG.

#### Methods

##### `initialize(): Promise<void>`

Initializes the operator by connecting to an Android device.

##### `screenshot(): Promise<ScreenshotOutput>`

Takes a screenshot of the Android device screen.

- Returns: A promise that resolves to a `ScreenshotOutput` object containing:
  - `base64`: The base64-encoded image data
  - `status`: The status of the operation ('success' or 'error')

##### `execute(params: ExecuteParams): Promise<ExecuteOutput>`

Executes a list of actions on the Android device.

- `params`: An object containing:
  - `actions`: An array of action objects
- Returns: A promise that resolves to an `ExecuteOutput` object containing:
  - `status`: The status of the operation ('success' or 'error')

### Supported Actions

#### Touch Actions

- `click`, `tap`: Perform a tap at specified coordinates
- `swipe`: Swipe from one position to another
- `long_press`: Long press at specified coordinates

#### Keyboard Actions

- `type`: Type text
- `hotkey`: Press a key combination
- `press`: Press a key
- `release`: Release a key

#### Other Actions

- `wait`: Wait for a specified time

## Acknowledgements

This project uses [YADB](https://github.com/ysbing/YADB) for enhanced ADB functionality, particularly for screenshot capture in restricted apps and other advanced features. We're grateful to the YADB team for their excellent work extending ADB capabilities.

## License

This project is licensed under the Apache-2.0 License.
