/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Page } from '@agent-infra/browser';
import { Logger } from '@agent-infra/logger';
import { ParsedPrediction } from './types';

/**
 * Helper class for UI interactions in the browser
 * Provides visual feedback for actions and information display
 */
export class UIHelper {
  private styleId = 'gui-agent-helper-styles';
  private containerId = 'gui-agent-helper-container';
  private highlightClass = 'gui-agent-clickable-highlight';
  private waterFlowId = 'gui-agent-water-flow';

  /**
   * Creates a new UIHelper instance
   * @param getCurrentPage Function that returns the current active page
   */
  constructor(
    private getCurrentPage: () => Promise<Page>,
    private logger: Logger,
  ) {
    this.logger = logger.spawn('[UIHelper]');
  }

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

        .gui-agent-drag-indicator {
          position: fixed;
          pointer-events: none;
          z-index: 2147483647;
        }

        .gui-agent-drag-start {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 3px solid #ff6b00;
          background: rgba(255, 107, 0, 0.4);
          transform: translate(-50%, -50%);
          position: absolute;
        }

        .gui-agent-drag-end {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 3px solid #00c3ff;
          background: rgba(0, 195, 255, 0.4);
          transform: translate(-50%, -50%);
          position: absolute;
        }

        .gui-agent-drag-path {
          position: absolute;
          height: 6px;
          background: linear-gradient(to right, #ff6b00, #00c3ff);
          border-radius: 3px;
          transform-origin: left center;
          opacity: 0.7;
        }

        .gui-agent-drag-arrow {
          position: absolute;
          width: 0;
          height: a0;
          border-top: 12px solid transparent;
          border-bottom: 12px solid transparent;
          border-left: 16px solid #00c3ff;
          transform-origin: left center;
          right: -16px;
          top: -9px;
        }

        .gui-agent-clickable-highlight {
          outline: 3px solid rgba(0, 155, 255, 0.7) !important;
          box-shadow: 0 0 0 3px rgba(0, 155, 255, 0.3) !important;
          background-color: rgba(0, 155, 255, 0.05) !important;
          transition: all 0.2s ease-in-out !important;
          z-index: 999 !important;
          position: relative !important;
        }

        .gui-agent-clickable-highlight:hover {
          outline: 4px solid rgba(0, 155, 255, 0.9) !important;
          background-color: rgba(0, 155, 255, 0.1) !important;
        }

        .gui-agent-clickable-highlight.gui-highlight-button {
          outline: 3px solid rgba(255, 64, 129, 0.8) !important;
          box-shadow: 0 0 0 3px rgba(255, 64, 129, 0.3) !important;
          background-color: rgba(255, 64, 129, 0.05) !important;
        }

        .gui-agent-clickable-highlight.gui-highlight-button:hover {
          outline: 4px solid rgba(255, 64, 129, 0.9) !important;
          background-color: rgba(255, 64, 129, 0.1) !important;
        }

        .gui-agent-clickable-highlight.gui-highlight-link {
          outline: 3px solid rgba(124, 77, 255, 0.8) !important;
          box-shadow: 0 0 0 3px rgba(124, 77, 255, 0.3) !important;
          background-color: rgba(124, 77, 255, 0.05) !important;
        }

        .gui-agent-clickable-highlight.gui-highlight-link:hover {
          outline: 4px solid rgba(124, 77, 255, 0.9) !important;
          background-color: rgba(124, 77, 255, 0.1) !important;
        }

        .gui-agent-clickable-highlight.gui-highlight-input {
          outline: 3px solid rgba(0, 230, 118, 0.8) !important;
          box-shadow: 0 0 0 3px rgba(0, 230, 118, 0.3) !important;
          background-color: rgba(0, 230, 118, 0.05) !important;
        }

        .gui-agent-clickable-highlight.gui-highlight-input:hover {
          outline: 4px solid rgba(0, 230, 118, 0.9) !important;
          background-color: rgba(0, 230, 118, 0.1) !important;
        }

        .gui-agent-clickable-highlight.gui-highlight-other {
          outline: 3px solid rgba(255, 171, 0, 0.8) !important;
          box-shadow: 0 0 0 3px rgba(255, 171, 0, 0.3) !important;
          background-color: rgba(255, 171, 0, 0.05) !important;
        }

        .gui-agent-clickable-highlight.gui-highlight-other:hover {
          outline: 4px solid rgba(255, 171, 0, 0.9) !important;
          background-color: rgba(255, 171, 0, 0.1) !important;
        }

        .gui-agent-legend {
          position: fixed;
          bottom: 20px;
          left: 20px;
          background: rgba(0, 0, 0, 0.85);
          color: white;
          padding: 12px 18px;
          border-radius: 10px;
          font-family: system-ui;
          font-size: 12px;
          z-index: 999999;
          backdrop-filter: blur(8px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .gui-agent-legend-title {
          font-weight: 600;
          margin-bottom: 4px;
          font-size: 13px;
        }

        .gui-agent-legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .gui-agent-legend-icon {
          display: inline-block;
          width: 14px;
          height: 14px;
          border-radius: 3px;
          border: 2px solid rgba(255, 255, 255, 0.8);
        }

        .gui-legend-button {
          background: rgba(255, 64, 129, 0.7);
        }

        .gui-legend-link {
          background: rgba(124, 77, 255, 0.7);
        }

        .gui-legend-input {
          background: rgba(0, 230, 118, 0.7);
        }

        .gui-legend-other {
          background: rgba(255, 171, 0, 0.7);
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
    this.logger.info('Showing action info ...');
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
    this.logger.info('Showing action info done.');
  }

  /**
   * Shows a visual click indicator at the specified coordinates
   * @param x X coordinate for the click
   * @param y Y coordinate for the click
   */
  async showClickIndicator(x: number, y: number) {
    this.logger.info('Showing click indicator...');
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
    this.logger.info('Showing click indicator done.');
  }

  async showWaterFlow() {
    this.logger.info('Showing water flow effect...');

    await this.injectStyles();
    const page = await this.getCurrentPage();

    await page.evaluate((waterFlowId: string) => {
      if (document.getElementById(waterFlowId)) return;

      const waterFlow = document.createElement('div');
      waterFlow.id = waterFlowId;
      waterFlow.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
        z-index: 2147483647;
      `;

      const style = document.createElement('style');
      style.textContent = `
        #${waterFlowId}::before {
          content: "";
          position: fixed;
          top: 0; right: 0; bottom: 0; left: 0;
          pointer-events: none;
          z-index: 9999;
          background:
            linear-gradient(to right, rgba(30, 144, 255, 0.4), transparent 50%) left,
            linear-gradient(to left, rgba(30, 144, 255, 0.4), transparent 50%) right,
            linear-gradient(to bottom, rgba(30, 144, 255, 0.4), transparent 50%) top,
            linear-gradient(to top, rgba(30, 144, 255, 0.4), transparent 50%) bottom;
          background-repeat: no-repeat;
          background-size: 10% 100%, 10% 100%, 100% 10%, 100% 10%;
          animation: waterflow 5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          filter: blur(8px);
        }

        @keyframes waterflow {
          0%, 100% {
            background-image:
              linear-gradient(to right, rgba(30, 144, 255, 0.4), transparent 50%),
              linear-gradient(to left, rgba(30, 144, 255, 0.4), transparent 50%),
              linear-gradient(to bottom, rgba(30, 144, 255, 0.4), transparent 50%),
              linear-gradient(to top, rgba(30, 144, 255, 0.4), transparent 50%);
            transform: scale(1);
          }
          25% {
            background-image:
              linear-gradient(to right, rgba(30, 144, 255, 0.39), transparent 52%),
              linear-gradient(to left, rgba(30, 144, 255, 0.39), transparent 52%),
              linear-gradient(to bottom, rgba(30, 144, 255, 0.39), transparent 52%),
              linear-gradient(to top, rgba(30, 144, 255, 0.39), transparent 52%);
            transform: scale(1.03);
          }
          50% {
            background-image:
              linear-gradient(to right, rgba(30, 144, 255, 0.38), transparent 55%),
              linear-gradient(to left, rgba(30, 144, 255, 0.38), transparent 55%),
              linear-gradient(to bottom, rgba(30, 144, 255, 0.38), transparent 55%),
              linear-gradient(to top, rgba(30, 144, 255, 0.38), transparent 55%);
            transform: scale(1.05);
          }
          75% {
            background-image:
              linear-gradient(to right, rgba(30, 144, 255, 0.39), transparent 52%),
              linear-gradient(to left, rgba(30, 144, 255, 0.39), transparent 52%),
              linear-gradient(to bottom, rgba(30, 144, 255, 0.39), transparent 52%),
              linear-gradient(to top, rgba(30, 144, 255, 0.39), transparent 52%);
            transform: scale(1.03);
          }
        }
      `;

      document.head.appendChild(style);
      document.body.appendChild(waterFlow);
    }, this.waterFlowId);

    this.logger.info('Water flow effect shown.');
  }

  async hideWaterFlow() {
    this.logger.info('Hiding water flow effect...');

    const page = await this.getCurrentPage();

    await page.evaluate((waterFlowId: string) => {
      const waterFlow = document.getElementById(waterFlowId);
      if (waterFlow) {
        waterFlow.remove();
      }
    }, this.waterFlowId);

    this.logger.info('Water flow effect hidden.');
  }

  /**
   * Highlights all clickable elements on the page using SoM-inspired approach
   * Should be called before taking a screenshot to show interactive elements
   */
  async highlightClickableElements() {
    this.logger.info('Highlighting clickable elements...');
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
          <div class="gui-agent-legend-title">Clickable Elements</div>
          <div class="gui-agent-legend-item">
            <span class="gui-agent-legend-icon gui-legend-button"></span>
            <span>Buttons</span>
          </div>
          <div class="gui-agent-legend-item">
            <span class="gui-agent-legend-icon gui-legend-link"></span>
            <span>Links</span>
          </div>
          <div class="gui-agent-legend-item">
            <span class="gui-agent-legend-icon gui-legend-input"></span>
            <span>Input Fields</span>
          </div>
          <div class="gui-agent-legend-item">
            <span class="gui-agent-legend-icon gui-legend-other"></span>
            <span>Other Clickables</span>
          </div>
        `;
        document.body.appendChild(legend);
      };

      createLegend();

      // Common clickable selectors
      const buttonSelectors = [
        'button',
        '[role="button"]',
        '.btn',
        '.button',
        '[type="button"]',
        '[type="submit"]',
        '[type="reset"]',
      ];

      const linkSelectors = ['a', '[role="link"]', '.nav-item'];

      const inputSelectors = [
        'input',
        'select',
        'textarea',
        '[role="checkbox"]',
        '[role="radio"]',
        '[role="textbox"]',
        '[contenteditable="true"]',
      ];

      const otherSelectors = [
        '[role="tab"]',
        '[role="menuitem"]',
        '[role="option"]',
        '[onclick]',
        '[tabindex="0"]',
        '.clickable',
        '.selectable',
        'summary',
        'details',
        'label',
      ];

      // Helper function to add highlight class with specific type
      const highlightElements = (selectors: string[], typeClass: string) => {
        const selector = selectors.join(', ');
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
          el.classList.add(typeClass);
        });

        return visibleElements.length;
      };

      // Highlight different types of elements
      const buttonCount = highlightElements(
        buttonSelectors,
        'gui-highlight-button',
      );
      const linkCount = highlightElements(linkSelectors, 'gui-highlight-link');
      const inputCount = highlightElements(
        inputSelectors,
        'gui-highlight-input',
      );
      const otherCount = highlightElements(
        otherSelectors,
        'gui-highlight-other',
      );

      // Return stats for logging
      return {
        buttons: buttonCount,
        links: linkCount,
        inputs: inputCount,
        others: otherCount,
        total: buttonCount + linkCount + inputCount + otherCount,
      };
    }, this.highlightClass);
    this.logger.info('Highlighting clickable elements done.');
  }

  /**
   * Removes highlighting from clickable elements
   */
  async removeClickableHighlights() {
    this.logger.info('Removing clickable highlights...');
    try {
      const page = await this.getCurrentPage();
      await page.evaluate((highlightClass) => {
        // Remove all highlight classes
        const highlightedElements = document.querySelectorAll(
          `.${highlightClass}`,
        );
        highlightedElements.forEach((el) => {
          el.classList.remove(highlightClass);
          el.classList.remove('gui-highlight-button');
          el.classList.remove('gui-highlight-link');
          el.classList.remove('gui-highlight-input');
          el.classList.remove('gui-highlight-other');
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
    this.logger.info('Removing clickable highlights done.');
  }

  async cleanupTemporaryVisuals() {
    try {
      this.logger.info('cleanupTemporaryVisuals up...');
      const page = await this.getCurrentPage();
      await page.evaluate((containerId: string) => {
        const container = document.getElementById(containerId);
        if (container) {
          container.remove();
        }
      }, this.containerId);
      this.logger.info('cleanupTemporaryVisuals up done!');
    } catch (error) {
      // Silently handle errors during cleanup
      console.error('Error during UIHelper cleanup:', error);
    }
  }

  /**
   * Removes all UI helper elements from the page
   */
  async cleanup() {
    try {
      this.logger.info('Cleaning up...');
      await this.removeClickableHighlights();
      await this.hideWaterFlow();

      const page = await this.getCurrentPage();
      await page.evaluate((containerId: string) => {
        const container = document.getElementById(containerId);
        if (container) {
          container.remove();
        }
      }, this.containerId);
      this.logger.info('Cleaning up done!');
    } catch (error) {
      // Silently handle errors during cleanup
      console.error('Error during UIHelper cleanup:', error);
    }
  }

  /**
   * Shows a visual drag indicator from start to end coordinates
   * @param startX Starting X coordinate
   * @param startY Starting Y coordinate
   * @param endX Ending X coordinate
   * @param endY Ending Y coordinate
   */
  async showDragIndicator(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
  ) {
    this.logger.info('Showing drag indicator...');
    await this.injectStyles();
    const page = await this.getCurrentPage();

    await page.evaluate(
      // eslint-disable-next-line no-shadow
      ({ startX, startY, endX, endY, containerId }) => {
        // Remove any existing indicators
        const existingIndicators = document.querySelectorAll(
          '.gui-agent-drag-indicator',
        );
        existingIndicators.forEach((el) => el.remove());

        // Create container for the drag indicator
        const dragIndicator = document.createElement('div');
        dragIndicator.className = 'gui-agent-drag-indicator';
        document.body.appendChild(dragIndicator);

        // Create start point indicator
        const startPoint = document.createElement('div');
        startPoint.className = 'gui-agent-drag-start';
        startPoint.style.left = `${startX}px`;
        startPoint.style.top = `${startY}px`;
        dragIndicator.appendChild(startPoint);

        // Create end point indicator
        const endPoint = document.createElement('div');
        endPoint.className = 'gui-agent-drag-end';
        endPoint.style.left = `${endX}px`;
        endPoint.style.top = `${endY}px`;
        dragIndicator.appendChild(endPoint);

        // Create drag path
        const dragPath = document.createElement('div');
        dragPath.className = 'gui-agent-drag-path';

        // Calculate path position and rotation
        const dx = endX - startX;
        const dy = endY - startY;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        dragPath.style.width = `${length}px`;
        dragPath.style.left = `${startX}px`;
        dragPath.style.top = `${startY}px`;
        dragPath.style.transform = `rotate(${angle}deg)`;

        // Add arrow for direction
        const arrow = document.createElement('div');
        arrow.className = 'gui-agent-drag-arrow';
        dragPath.appendChild(arrow);

        dragIndicator.appendChild(dragPath);

        // Update coords in container
        const container = document.getElementById(containerId);
        if (container) {
          const coordsDiv = document.createElement('div');
          coordsDiv.className = 'gui-agent-coords';
          coordsDiv.textContent = `Drag from: (${Math.round(startX)}, ${Math.round(startY)}) to (${Math.round(endX)}, ${Math.round(endY)})`;

          const existingCoords = container.querySelector('.gui-agent-coords');
          if (existingCoords) {
            existingCoords.remove();
          }

          container.appendChild(coordsDiv);
        }

        // Remove indicator after animation
        setTimeout(() => {
          dragIndicator.remove();
        }, 3000);
      },
      { startX, startY, endX, endY, containerId: this.containerId },
    );
    this.logger.info('Showing drag indicator done.');
  }
}
