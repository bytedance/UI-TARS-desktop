/**
 * GUI Tool Call Engine Provider
 * Provides optimized tool call engine for GUI automation and computer use tasks
 */

import { ToolCallEngineProvider, ToolCallEngineContext } from '@omni-tars/core';
import { GUIAgentToolCallEngine } from './GUIAgentToolCallEngine';

export class GuiToolCallEngineProvider extends ToolCallEngineProvider<GUIAgentToolCallEngine> {
  readonly name = 'gui-tool-call-engine';
  readonly priority = 90; // High priority for GUI tasks
  readonly description =
    'Tool call engine optimized for GUI automation, computer use, and visual interface interactions';

  protected createEngine(): GUIAgentToolCallEngine {
    return new GUIAgentToolCallEngine();
  }

  canHandle(context: ToolCallEngineContext): boolean {
    // Check if the latest model output contains <computer_env></computer_env> tags
    if (context.latestAssistantMessage) {
      const hasComputerEnvTags = context.latestAssistantMessage.includes('<computer_env>');
      if (hasComputerEnvTags) {
        return true;
      }
    }

    // Fallback: Check if any tools are GUI/computer use related
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

    const hasGuiTools = context?.toolCalls?.some((tool) =>
      guiToolNames.some((guiName) =>
        tool.function.name.toLowerCase().includes(guiName.toLowerCase()),
      ),
    );

    return !!hasGuiTools;
  }
}
