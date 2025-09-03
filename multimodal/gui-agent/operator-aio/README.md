# @gui-agent/operator-aio

AIO (All-in-One) operator for GUI Agent that provides comprehensive computer control capabilities.

## Features

- Remote computer control
- Mouse operations (click, drag, scroll)
- Keyboard input and hotkeys
- Screenshot capture
- Cross-platform support

## Installation

```bash
npm install @gui-agent/operator-aio
```

## Usage

```typescript
import { AioOperator } from '@gui-agent/operator-aio';

// Create AIO operator instance
const operator = await AioOperator.create();

// Take screenshot
const screenshot = await operator.screenshot();

// Execute actions
const result = await operator.execute({
  parsedPrediction: {
    action_type: 'click',
    action_inputs: {
      start_box: '[100, 100, 200, 200]'
    }
  },
  screenWidth: 1920,
  screenHeight: 1080,
  scaleFactor: 1
});
```

## License

Apache-2.0
