/**
 * Target path: apps/ui-tars/src/main/shared/setOfMarks.test.ts
 */
import { describe, expect, it } from 'vitest';
import { setOfMarksOverlays } from './setOfMarks';

const screenshotContext = {
  size: { width: 1920, height: 1080 },
} as any;

describe('setOfMarksOverlays SVG escaping', () => {
  it('escapes content for type action', () => {
    const predictions = [
      {
        action_type: 'type',
        action_inputs: {
          content: '<img src=x onerror=alert(1)>',
        },
      },
    ] as any;

    const { overlays } = setOfMarksOverlays({
      predictions,
      screenshotContext,
      xPos: 100,
      yPos: 100,
    });

    expect(overlays[0].svg).toContain('&lt;img');
    expect(overlays[0].svg).not.toContain('<img');
  });

  it('escapes hotkey text', () => {
    const predictions = [
      {
        action_type: 'hotkey',
        action_inputs: {
          key: 'ctrl <script>alert(1)</script>',
        },
      },
    ] as any;

    const { overlays } = setOfMarksOverlays({
      predictions,
      screenshotContext,
      xPos: 100,
      yPos: 100,
    });

    expect(overlays[0].svg).toContain('&lt;script&gt;');
    expect(overlays[0].svg).not.toContain('<script>');
  });
});
