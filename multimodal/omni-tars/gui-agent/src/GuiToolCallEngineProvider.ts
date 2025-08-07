/**
 * GUI Tool Call Engine Provider
 * Provides optimized tool call engine for GUI automation and computer use tasks
 */

import { ToolCallEngineProvider, ToolCallEngineContext } from '@omni-tars/core';
import { GuiToolCallEngine } from './GuiToolCallEngine';

export class GuiToolCallEngineProvider extends ToolCallEngineProvider<GuiToolCallEngine> {
  readonly name = 'gui-tool-call-engine';
  readonly priority = 90; // High priority for GUI tasks
  readonly description =
    'Tool call engine optimized for GUI automation, computer use, and visual interface interactions';

  protected createEngine(): GuiToolCallEngine {
    return new GuiToolCallEngine();
  }

  canHandle(context: ToolCallEngineContext): boolean {
    // Check if any tools are GUI/computer use related
    const guiToolNames = [
      'screenshot',
      'click',
      'type',
      'scroll',
      'computer_use',
      'gui',
      'mouse',
      'keyboard',
      'window',
      'screen',
      'capture',
      'browser',
    ];

    const hasGuiTools = context.tools.some((tool) =>
      guiToolNames.some((guiName) =>
        tool.function.name.toLowerCase().includes(guiName.toLowerCase()),
      ),
    );

    // Also check for computer use in tool descriptions
    const hasComputerUseDescription = context.tools.some(
      (tool) =>
        tool.description?.toLowerCase().includes('computer use') ||
        tool.description?.toLowerCase().includes('gui') ||
        tool.description?.toLowerCase().includes('screen'),
    );

    return hasGuiTools || hasComputerUseDescription;
  }
}
