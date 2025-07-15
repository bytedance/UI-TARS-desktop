/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { type ExecuteParams } from '@ui-tars/sdk/core';
import {
  Button,
  Key,
  Point,
  Region,
  centerOf,
  keyboard,
  mouse,
  straightTo,
} from '@computer-use/nut-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NutJSOperator } from '../src/index';

vi.mock('@ui-tars/sdk/core', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    useContext: vi.fn().mockReturnValue({
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
      factor: 1000,
    }),
    Operator: actual.Operator,
    parseBoxToScreenCoords: actual.parseBoxToScreenCoords,
  };
});

// Mock @computer-use/nut-js
vi.mock('@computer-use/nut-js', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    mouse: {
      move: vi.fn(),
      click: vi.fn(),
      config: {
        mouseSpeed: 1500,
      },
      drag: vi.fn(),
    },
    Key: actual.Key,
    keyboard: {
      type: vi.fn(),
      pressKey: vi.fn(),
      releaseKey: vi.fn(),
      config: {
        autoDelayMs: 0,
      },
    },
    Button: {
      LEFT: 'left',
      RIGHT: 'right',
      MIDDLE: 'middle',
    },
    Point: actual.Point,
    Region: actual.Region,
    straightTo: vi.fn((point) => point),
    centerOf: vi.fn((region) => region),
    randomPointIn: vi.fn((region) => region),
    sleep: vi.fn(),
  };
});

describe('execute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Click on the search bar at the top of the screen', async () => {
    const nutJSOperator = new NutJSOperator();
    const executeParams: ExecuteParams = {
      prediction:
        "Thought: Click on the search bar at the top of the screen\nAction: click(start_box='(72,74)')",
      parsedPrediction: {
        reflection: '',
        thought: 'Click on the search bar at the top of the screen\n',
        action_type: 'click',
        action_inputs: {
          start_box: '[0.072,0.646,0.072,0.646]',
          start_coords: [138.24, 697.68],
        },
      },
      screenWidth: 1920,
      screenHeight: 1080,
      scaleFactor: 1,
    };

    await nutJSOperator.execute(executeParams);

    expect(mouse.move).toHaveBeenCalledWith(
      straightTo(new Point(138.24, 697.68)),
    );

    expect(mouse.click).toHaveBeenCalledWith(Button.LEFT);
  });

  it('type doubao.com\n', async () => {
    const nutJSOperator = new NutJSOperator();
    const executeParams: ExecuteParams = {
      prediction:
        "Thought: To proceed with the task of accessing doubao.com, I need to type the URL into the address bar. This will allow me to navigate to the website and continue with the subsequent steps of the task.\nAction: type(content='doubao.com\\n')",
      parsedPrediction: {
        reflection: '',
        thought:
          'To proceed with the task of accessing doubao.com, I need to type the URL into the address bar. This will allow me to navigate to the website and continue with the subsequent steps of the task.\n' +
          `Type "doubao.com" into the browser's address bar.`,
        action_type: 'type',
        action_inputs: { content: 'doubao.com\\n' },
      },
      screenWidth: 1920,
      screenHeight: 1080,
      scaleFactor: 1,
    };

    await nutJSOperator.execute(executeParams);

    expect(keyboard.type).toHaveBeenCalledWith('doubao.com');
    expect(keyboard.pressKey).toHaveBeenCalledWith(Key.Enter);
  });

  it('type doubao.com', async () => {
    const nutJSOperator = new NutJSOperator();
    const executeParams: ExecuteParams = {
      prediction:
        "Thought: To proceed with the task of accessing doubao.com, I need to type the URL into the address bar. This will allow me to navigate to the website and continue with the subsequent steps of the task.\nAction: type(content='doubao.com')",
      parsedPrediction: {
        reflection: '',
        thought:
          'To proceed with the task of accessing doubao.com, I need to type the URL into the address bar. This will allow me to navigate to the website and continue with the subsequent steps of the task.\n' +
          `Type "doubao.com" into the browser's address bar.`,
        action_type: 'type',
        action_inputs: { content: 'doubao.com' },
      },
      screenWidth: 1920,
      screenHeight: 1080,
      scaleFactor: 1,
    };

    await nutJSOperator.execute(executeParams);

    expect(keyboard.type).toHaveBeenCalledWith('doubao.com');
    expect(keyboard.pressKey).not.toHaveBeenCalledWith(Key.Enter);
  });

  it('type Hello World\nUI-TARS\n', async () => {
    const nutJSOperator = new NutJSOperator();
    const executeParams: ExecuteParams = {
      prediction:
        "Thought: To proceed with the task of accessing doubao.com, I need to type the URL into the address bar. This will allow me to navigate to the website and continue with the subsequent steps of the task.\nAction: type(content='Hello World\\nUI-TARS\\n')",
      parsedPrediction: {
        reflection: '',
        thought:
          'To proceed with the task of accessing doubao.com, I need to type the URL into the address bar. This will allow me to navigate to the website and continue with the subsequent steps of the task.\n' +
          `Type "Hello World\nUI-TARS\n" into the browser's address bar.`,
        action_type: 'type',
        action_inputs: { content: 'Hello World\\nUI-TARS\\n' },
      },
      screenWidth: 1920,
      screenHeight: 1080,
      scaleFactor: 1,
    };

    await nutJSOperator.execute(executeParams);

    expect(keyboard.type).toHaveBeenCalledWith('Hello World\\nUI-TARS');
    expect(keyboard.pressKey).toHaveBeenCalledWith(Key.Enter);
  });

  it('drag slider horizontally', async () => {
    const nutJSOperator = new NutJSOperator();
    const executeParams: ExecuteParams = {
      prediction:
        "Thought: To narrow down the search results to cat litters within the specified price range of $18 to $32, I need to adjust the price filter. The next logical step is to drag the left handle of the price slider to set the minimum price to $18, ensuring that only products within the desired range are displayed.\nAction: drag(start_box='(72,74)', end_box='(175,74)')",
      parsedPrediction: {
        reflection: '',
        thought:
          'To narrow down the search results to cat litters within the specified price range of $18 to $32, I need to adjust the price filter. The next logical step is to drag the left handle of the price slider to set the minimum price to $18, ensuring that only products within the desired range are displayed.\n' +
          'Drag the left handle of the price slider to set the minimum price to $18.',
        action_type: 'drag',
        action_inputs: {
          start_box: '[0.072,0.646,0.072,0.646]',
          end_box: '[0.175,0.647,0.175,0.647]',
          start_coords: [138.24, 697.68],
          end_coords: [336, 698.76],
        },
      },
      screenWidth: 1920,
      screenHeight: 1080,
      scaleFactor: 1,
    };

    await nutJSOperator.execute(executeParams);

    expect(mouse.move).toHaveBeenCalledWith(
      straightTo(new Point(138.24, 697.68)),
    );

    expect(mouse.drag).toHaveBeenCalledWith(straightTo(new Point(336, 698.76)));
  });

  it('drag slider vertically', async () => {
    const nutJSOperator = new NutJSOperator();
    const executeParams: ExecuteParams = {
      prediction:
        "Thought: To narrow down the search results to cat litters within the specified price range of $18 to $32, I need to adjust the price filter. The next logical step is to drag the left handle of the price slider to set the minimum price to $18, ensuring that only products within the desired range are displayed.\nAction: drag(start_box='(72,74)', end_box='(72,546)')",
      parsedPrediction: {
        reflection: '',
        thought:
          'To narrow down the search results to cat litters within the specified price range of $18 to $32, I need to adjust the price filter. The next logical step is to drag the left handle of the price slider to set the minimum price to $18, ensuring that only products within the desired range are displayed.\n' +
          'Drag the left handle of the price slider to set the minimum price to $18.',
        action_type: 'drag',
        action_inputs: {
          start_box: '[0.072,0.646,0.072,0.646]',
          end_box: '[0.072,0.546,0.072,0.546]',
          start_coords: [138.24, 697.68],
          end_coords: [138.24, 589.68],
        },
      },
      screenWidth: 1920,
      screenHeight: 1080,
      scaleFactor: 1,
    };

    await nutJSOperator.execute(executeParams);

    expect(mouse.move).toHaveBeenCalledWith(
      straightTo(new Point(138.24, 697.68)),
    );

    expect(mouse.drag).toHaveBeenCalledWith(
      straightTo(new Point(138.24, 589.68)),
    );
  });
});
