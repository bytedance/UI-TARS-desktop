# NutJS Operator

## Overview

NutJS Operator is a computer operator based on [NutJS](https://github.com/nut-tree/nut.js) for GUI Agent. It provides a set of APIs to interact with the desktop environment, including taking screenshots, mouse operations, keyboard operations, and more.

## Installation

```bash
npm install @gui-agent/operator-nutjs
```

Or with yarn:

```bash
yarn add @gui-agent/operator-nutjs
```

Or with pnpm:

```bash
pnpm add @gui-agent/operator-nutjs
```

## Features

- **Screenshot**: Capture the screen with proper scaling for high DPI displays
- **Mouse Operations**: Move, click, double-click, right-click, drag, etc.
- **Keyboard Operations**: Type text, press hotkeys, etc.
- **Scroll**: Scroll up and down
- **Wait**: Wait for a specified time

## Usage

```typescript
import { NutJSOperator } from '@gui-agent/operator-nutjs';
import { ConsoleLogger, LogLevel } from '@agent-infra/logger';

// Create a logger
const logger = new ConsoleLogger(undefined, LogLevel.DEBUG);

// Create an operator instance
const operator = new NutJSOperator(logger);

// Take a screenshot
const screenshot = await operator.screenshot();
console.log('Screenshot taken:', screenshot.status);

// Execute actions
const result = await operator.execute({
  actions: [
    {
      type: 'click',
      inputs: {
        point: {
          normalized: { x: 0.5, y: 0.5 } // Click at the center of the screen
        }
      }
    },
    {
      type: 'type',
      inputs: {
        content: 'Hello, World!'
      }
    }
  ]
});
```

## API Reference

### `NutJSOperator`

The main class that provides methods to interact with the desktop environment.

#### Constructor

```typescript
constructor(logger: ConsoleLogger = defaultLogger)
```

- `logger`: A ConsoleLogger instance for logging. Default is a ConsoleLogger with LogLevel.DEBUG.

#### Methods

##### `screenshot(): Promise<ScreenshotOutput>`

Takes a screenshot of the screen.

- Returns: A promise that resolves to a `ScreenshotOutput` object containing:
  - `base64`: The base64-encoded image data
  - `contentType`: The content type of the image (e.g., 'image/jpeg')
  - `status`: The status of the operation ('success' or 'error')

##### `execute(params: ExecuteParams): Promise<ExecuteOutput>`

Executes a list of actions.

- `params`: An object containing:
  - `actions`: An array of action objects
- Returns: A promise that resolves to an `ExecuteOutput` object containing:
  - `status`: The status of the operation ('success' or 'error')

### Supported Actions

#### Mouse Actions

- `move`, `move_to`, `mouse_move`, `hover`: Move the mouse to a specified position
- `click`, `left_click`, `left_single`: Perform a left mouse click
- `left_double`, `double_click`: Perform a double left mouse click
- `right_click`, `right_single`: Perform a right mouse click
- `middle_click`: Perform a middle mouse click
- `left_click_drag`, `drag`, `select`: Drag the mouse from one position to another

#### Keyboard Actions

- `type`: Type text
- `hotkey`: Press a hotkey combination
- `press`: Press a key
- `release`: Release a key

#### Other Actions

- `scroll`: Scroll up or down
- `wait`: Wait for a specified time
- `finished`: Do nothing (used to indicate the end of actions)

## License

Apache-2.0