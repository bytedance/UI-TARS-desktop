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
  private highlightClass = 'gui-agent-clickable-highlight';

  /**
   * Creates a new UIHelper instance
   * @param getCurrentPage Function that returns the current active page
   */
  constructor(private getCurrentPage: () => Promise<Page>) {}

  /**
   * Injects required CSS styles into the page
   * Creates styling for action indicators and information panels
   */
  private async injectStyles() {
    const page = await this.getCurrentPage();
    await page.evaluate((styleId: string) => {
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

        .gui-agent-clickable-highlight {
          outline: 2px solid rgba(0, 255, 157, 0.7) !important;
          box-shadow: 0 0 0 2px rgba(0, 255, 157, 0.3) !important;
          background-color: rgba(0, 255, 157, 0.05) !important;
          transition: all 0.2s ease-in-out !important;
          z-index: 999 !important;
          position: relative !important;
        }

        .gui-agent-clickable-highlight:hover {
          outline: 3px solid rgba(0, 255, 157, 0.9) !important;
          background-color: rgba(0, 255, 157, 0.1) !important;
        }

        .gui-agent-legend {
          position: fixed;
          bottom: 20px;
          left: 20px;
          background: rgba(0, 0, 0, 0.85);
          color: white;
          padding: 10px 15px;
          border-radius: 8px;
          font-family: system-ui;
          font-size: 12px;
          z-index: 999999;
          backdrop-filter: blur(8px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .gui-agent-legend-icon {
          display: inline-block;
          width: 12px;
          height: 12px;
          background: rgba(0, 255, 157, 0.7);
          border-radius: 2px;
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
    const page = await this.getCurrentPage();

    await page.evaluate(
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
    const page = await this.getCurrentPage();

    await page.evaluate(
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
   * Highlights all clickable elements on the page using SoM-inspired approach
   * Should be called before taking a screenshot to show interactive elements
   */
  async highlightClickableElements() {
    await this.injectStyles();
    const page = await this.getCurrentPage();

    // Remove any existing highlights first
    await this.removeClickableHighlights();

    await page.evaluate((highlightClass) => {
      // Create a legend to explain the highlighting
      const createLegend = () => {
        const legend = document.createElement('div');
        legend.className = 'gui-agent-legend';
        legend.id = 'gui-agent-clickable-legend';
        legend.innerHTML = `
          <span class="gui-agent-legend-icon"></span>
          <span>Clickable elements</span>
        `;
        document.body.appendChild(legend);
      };

      createLegend();

      // Common clickable selectors
      const clickableSelectors = [
        'a',
        'button',
        'input',
        'select',
        'textarea',
        '[role="button"]',
        '[role="link"]',
        '[role="checkbox"]',
        '[role="radio"]',
        '[role="tab"]',
        '[role="menuitem"]',
        '[role="option"]',
        '[onclick]',
        '[tabindex="0"]',
        '.btn',
        '.button',
        '.nav-item',
        '.clickable',
        '.selectable',
        'summary',
        'details',
        'label',
      ];

      // Find all potentially clickable elements
      const selector = clickableSelectors.join(', ');
      const elements = Array.from(document.querySelectorAll(selector));

      // Filter out hidden or disabled elements
      const visibleElements = elements.filter((el) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        const isVisible =
          rect.width > 0 &&
          rect.height > 0 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0';

        // Check if element or its ancestor has pointer-events: none
        let current = el as HTMLElement;
        let hasPointerEvents = true;
        while (current && current !== document.body) {
          if (window.getComputedStyle(current).pointerEvents === 'none') {
            hasPointerEvents = false;
            break;
          }
          current = current.parentElement as HTMLElement;
        }

        // Check if element is disabled
        const isDisabled =
          (el as HTMLElement).hasAttribute('disabled') ||
          (el as HTMLElement).getAttribute('aria-disabled') === 'true';

        return isVisible && hasPointerEvents && !isDisabled;
      });

      // Add highlight class to visible clickable elements
      visibleElements.forEach((el) => {
        el.classList.add(highlightClass);
      });

      // Return stats for logging
      return {
        total: elements.length,
        visible: visibleElements.length,
      };
    }, this.highlightClass);
  }

  /**
   * Removes highlighting from clickable elements
   */
  async removeClickableHighlights() {
    try {
      const page = await this.getCurrentPage();
      await page.evaluate((highlightClass) => {
        // Remove all highlight classes
        const highlightedElements = document.querySelectorAll(
          `.${highlightClass}`,
        );
        highlightedElements.forEach((el) => {
          el.classList.remove(highlightClass);
        });

        // Remove the legend if it exists
        const legend = document.getElementById('gui-agent-clickable-legend');
        if (legend) {
          legend.remove();
        }
      }, this.highlightClass);
    } catch (error) {
      // Silently handle errors during cleanup
      console.error('Error removing clickable highlights:', error);
    }
  }

  /**
   * Removes all UI helper elements from the page
   */
  async cleanup() {
    try {
      await this.removeClickableHighlights();

      const page = await this.getCurrentPage();
      await page.evaluate((containerId: string) => {
        const container = document.getElementById(containerId);
        if (container) {
          container.remove();
        }
      }, this.containerId);
    } catch (error) {
      // Silently handle errors during cleanup
      console.error('Error during UIHelper cleanup:', error);
    }
  }
}
