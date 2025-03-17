/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Page } from '@agent-infra/browser';
import { ParsedPrediction } from './types';

/**
 * Helper class for UI interactions in the browser
 * Provides visual feedback for actions and information display
 */
export class UIHelper {
  private styleId = 'gui-agent-helper-styles';
  private containerId = 'gui-agent-helper-container';

  /**
   * Creates a new UIHelper instance
   * @param page The browser page to attach UI elements to
   */
  constructor(private page: Page) {}

  /**
   * Injects required CSS styles into the page
   * Creates styling for action indicators and information panels
   */
  private async injectStyles() {
    await this.page.evaluate((styleId: string) => {
      if (document.getElementById(styleId)) return;

      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        #gui-agent-helper-container {
          position: fixed;
          top: 20px;
          right: 20px;
          background: rgba(0, 0, 0, 0.85); 
          color: white;
          padding: 15px 20px;
          border-radius: 12px;
          font-family: system-ui;
          z-index: 999999;
          max-width: 320px;
          backdrop-filter: blur(8px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .gui-agent-title {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 10px;
          color: #00ff9d;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .gui-agent-content {
          font-size: 13px;
          line-height: 1.5;
          color: rgba(255, 255, 255, 0.9);
        }

        .gui-agent-coords {
          margin-top: 8px;
          font-size: 12px;
          color: #00ff9d;
          opacity: 0.8;
        }

        .gui-agent-thought {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid rgba(255, 255, 255, 0.15);
          font-style: italic;
          color: rgba(255, 255, 255, 0.7);
          font-size: 12px;
        }

        .gui-agent-click-indicator {
          position: fixed;
          pointer-events: none;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          border: 4px solid #00ff9d;
          background: rgba(0, 255, 157, 0.3);
          transform: translate(-50%, -50%);
          animation: click-pulse 1.2s ease-out;
          z-index: 2147483647;
        }

        .gui-agent-click-indicator::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 12px;
          height: 12px;
          background: #00ff9d;
          border-radius: 50%;
          transform: translate(-50%, -50%);
        }

        @keyframes click-pulse {
          0% {
            transform: translate(-50%, -50%) scale(0.8);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(2.5);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }, this.styleId);
  }

  /**
   * Displays information about the current action being performed
   * @param prediction The parsed prediction containing action details
   */
  async showActionInfo(prediction: ParsedPrediction) {
    await this.injectStyles();

    const { action_type, action_inputs, thought } = prediction;

    await this.page.evaluate(
      (params) => {
        const { containerId, action_type, action_inputs, thought } = params;

        let container = document.getElementById(containerId);
        if (!container) {
          container = document.createElement('div');
          container.id = containerId;
          document.body.appendChild(container);
        }

        const actionMap = {
          click: '🖱️ Single Click',
          left_click: '🖱️ Single Click',
          left_single: '🖱️ Single Click',
          double_click: '🖱️ Double Click',
          left_double: '🖱️ Double Click',
          right_click: '🖱️ Right Click',
          type: `⌨️ Type: "${action_inputs.content}"`,
          navigate: `🌐 Navigate to: ${action_inputs.content}`,
          hotkey: `⌨️ Hotkey: ${action_inputs.key || action_inputs.hotkey}`,
          scroll: `📜 Scroll ${action_inputs.direction}`,
          wait: '⏳ Wait',
        };

        // @ts-expect-error
        const actionText = actionMap[action_type] || action_type;

        container.innerHTML = `
          <div class="gui-agent-title">Next Action</div>
          <div class="gui-agent-content">${actionText}</div>
          ${thought ? `<div class="gui-agent-thought">${thought}</div>` : ''}
        `;
      },
      { containerId: this.containerId, action_type, action_inputs, thought },
    );
  }

  /**
   * Shows a visual click indicator at the specified coordinates
   * @param x X coordinate for the click
   * @param y Y coordinate for the click
   */
  async showClickIndicator(x: number, y: number) {
    await this.injectStyles();

    await this.page.evaluate(
      // eslint-disable-next-line no-shadow
      ({ x, y, containerId }) => {
        // Remove any existing indicators
        const existingIndicators = document.querySelectorAll(
          '.gui-agent-click-indicator',
        );
        existingIndicators.forEach((el) => el.remove());

        // Create new indicator
        const indicator = document.createElement('div');
        indicator.className = 'gui-agent-click-indicator';
        indicator.style.left = `${x}px`;
        indicator.style.top = `${y}px`;
        document.body.appendChild(indicator);

        // Update coords in container
        const container = document.getElementById(containerId);
        if (container) {
          const coordsDiv = document.createElement('div');
          coordsDiv.className = 'gui-agent-coords';
          coordsDiv.textContent = `Click at: (${Math.round(x)}, ${Math.round(y)})`;

          const existingCoords = container.querySelector('.gui-agent-coords');
          if (existingCoords) {
            existingCoords.remove();
          }

          container.appendChild(coordsDiv);
        }

        // Remove indicator after animation
        setTimeout(() => {
          indicator.remove();
        }, 1200);
      },
      { x, y, containerId: this.containerId },
    );
  }

  /**
   * Removes all UI helper elements from the page
   */
  async cleanup() {
    await this.page.evaluate((containerId: string) => {
      const container = document.getElementById(containerId);
      if (container) {
        container.remove();
      }
    }, this.containerId);
  }
}
