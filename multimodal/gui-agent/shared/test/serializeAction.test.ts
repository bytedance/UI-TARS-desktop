/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { serializeAction } from '../src/utils';

describe('serializeGUIAction', () => {
  it('(1)', () => {
    const input = {
      type: 'click',
      inputs: {
        point: {
          raw: {
            x: 1,
            y: 1,
          },
          referenceBox: {
            x1: 1,
            x2: 1,
            y1: 1,
            y2: 1,
          },
        },
      },
    };
    const result = serializeAction(input);
    expect(result).toEqual(`click(point='(1, 1)')`);
  });

  it('(2)', () => {
    const input = {
      type: 'type',
      inputs: {
        content: 'Hello, world!',
        point: {
          raw: {
            x: 1,
            y: 1,
          },
          referenceBox: {
            x1: 1,
            x2: 1,
            y1: 1,
            y2: 1,
          },
        },
      },
    };
    const result = serializeAction(input);
    expect(result).toEqual(`type(content='Hello, world!', point='(1, 1)')`);
  });

  it('(3.1)', () => {
    const input = {
      type: 'type',
      inputs: {
        content: 'Hello, world!',
        point: {
          raw: {
            x: 1,
            y: 1,
          },
          normalized: {
            x: 0.001,
            y: 0.001,
          },
        },
      },
    };
    const result = serializeAction(input);
    expect(result).toEqual(`type(content='Hello, world!', point='(1, 1)')`);
  });

  it('(3.2)', () => {
    const input = {
      type: 'type',
      inputs: {
        content: 'Hello, world!',
        point: {
          normalized: {
            x: 0.001,
            y: 0.001,
          },
        },
      },
    };
    const result = serializeAction(input);
    expect(result).toEqual(`type(content='Hello, world!', point='(0.001, 0.001)')`);
  });

  it('(3.3)', () => {
    const input = {
      type: 'type',
      inputs: {
        content: 'Hello, world!',
        point: {
          normalized: {
            x: 0.001,
            y: 0.001,
          },
          referenceBox: {
            x1: 1,
            y1: 1,
            x2: 2,
            y2: 2,
          },
        },
      },
    };
    const result = serializeAction(input);
    expect(result).toEqual(`type(content='Hello, world!', point='<bbox>1, 1, 2, 2</bbox>')`);
  });

  it('(3.4)', () => {
    const input = {
      type: 'type',
      inputs: {
        content: 'Hello, world!',
        point: {
          raw: {
            x: 1,
            y: 1,
          },
          referenceBox: {
            x1: 1,
            y1: 1,
            x2: 2,
            y2: 2,
          },
          normalized: {
            x: 0.001,
            y: 0.001,
          },
        },
      },
    };
    const result = serializeAction(input);
    expect(result).toEqual(`type(content='Hello, world!', point='(1, 1)')`);
  });

  it('(3.5)', () => {
    const input = {
      type: 'type',
      inputs: {
        content: 'Hello, world!',
        point: {
          raw: {
            x: 1,
            y: 1,
          },
        },
      },
    };
    const result = serializeAction(input);
    expect(result).toEqual(`type(content='Hello, world!', point='(1, 1)')`);
  });

  it('(4)', () => {
    const input = {
      type: 'drag',
      inputs: {
        start: {
          raw: {
            x: 1,
            y: 1,
          },
        },
        end: {
          raw: {
            x: 1,
            y: 1,
          },
        },
      },
    };
    const result = serializeAction(input);
    expect(result).toEqual(`drag(start='(1, 1)', end='(1, 1)')`);
  });

  it('(5)', () => {
    const input = {
      type: 'scroll',
      inputs: {
        point: {
          raw: {
            x: 1,
            y: 1,
          },
        },
        direction: 'up',
      },
    };
    const result = serializeAction(input);
    expect(result).toEqual(`scroll(point='(1, 1)', direction='up')`);
  });

  it('(6)', () => {
    const input = {
      type: 'hotkey',
      inputs: {
        key: 'pagedown',
      },
    };
    const result = serializeAction(input);
    expect(result).toEqual(`hotkey(key='pagedown')`);
  });

  it('(7)', () => {
    const input = {
      type: 'navigate',
      inputs: {
        url: 'www.google.com',
      },
    };
    const result = serializeAction(input);
    expect(result).toEqual(`navigate(url='www.google.com')`);
  });

  it('(8)', () => {
    const input = {
      type: 'navigate_back',
      inputs: {},
    };
    const result = serializeAction(input);
    expect(result).toEqual(`navigate_back()`);
  });

  it('(9)', () => {
    const input = {
      type: 'mouse_down',
      inputs: {
        point: {
          raw: {
            x: 1,
            y: 1,
          },
          referenceBox: {
            x1: 1,
            x2: 1,
            y1: 1,
            y2: 1,
          },
        },
        button: 'left',
      },
    };
    const result = serializeAction(input);
    expect(result).toEqual(`mouse_down(point='(1, 1)', button='left')`);
  });

  it('(10)', () => {
    const input = {
      type: 'wait',
      inputs: {
        time: 1,
      },
    };
    const result = serializeAction(input);
    expect(result).toEqual(`wait(time='1s')`);
  });

  it('(11)', () => {
    const input = {
      type: 'wait',
      inputs: {},
    };
    const result = serializeAction(input);
    expect(result).toEqual(`wait()`);
  });
});
