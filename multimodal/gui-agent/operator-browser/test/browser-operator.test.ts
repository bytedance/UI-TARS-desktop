/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, vi } from 'vitest';

import { BrowserOperator } from '../src/browser-operator';

/**
 * Builds a BrowserOperator whose page and screen context are stubbed so the
 * coordinate guards can be exercised without a real browser.
 */
function createOperator() {
  const operator = new BrowserOperator({ browser: {} as any });

  const page = {
    mouse: { move: vi.fn(), down: vi.fn(), up: vi.fn(), wheel: vi.fn() },
    evaluate: vi.fn().mockResolvedValue(undefined),
  };

  (operator as any).getActivePage = vi.fn().mockResolvedValue(page);
  (operator as any).getScreenContext = vi.fn().mockResolvedValue({
    screenWidth: 1920,
    screenHeight: 1080,
    scaleX: 1,
    scaleY: 1,
  });

  return { operator, page };
}

describe('BrowserOperator coordinate guards', () => {
  describe('drag', () => {
    it('rejects non-finite coordinates instead of forwarding them', async () => {
      const { operator, page } = createOperator();

      await expect(
        (operator as any).handleDrag({
          start: { raw: { x: Number.NaN, y: 10 } },
          end: { raw: { x: 10, y: 10 } },
        }),
      ).rejects.toThrow('Invalid coordinates for drag operation');

      expect(page.mouse.move).not.toHaveBeenCalled();
    });

    it('preserves zero-valued coordinates', async () => {
      const { operator, page } = createOperator();

      await (operator as any).handleDrag({
        start: { raw: { x: 0, y: 0 } },
        end: { raw: { x: 0, y: 0 } },
      });

      expect(page.mouse.move).toHaveBeenCalledWith(0, 0);
    });
  });

  describe('scroll', () => {
    it('skips non-finite coordinates instead of forwarding them', async () => {
      const { operator, page } = createOperator();

      await (operator as any).handleScroll({
        point: { raw: { x: Number.NaN, y: 0 } },
        direction: 'down',
      });

      expect(page.mouse.move).not.toHaveBeenCalled();
    });

    it('preserves zero-valued coordinates', async () => {
      const { operator, page } = createOperator();

      await (operator as any).handleScroll({
        point: { raw: { x: 0, y: 0 } },
        direction: 'down',
      });

      expect(page.mouse.move).toHaveBeenCalledWith(0, 0);
    });
  });
});
