/**
 * GUI Tool Call Engine Provider
 * Provides optimized tool call engine for GUI automation and computer use tasks
 */

import { ToolCallEngineProvider, ToolCallEngineContext, AgentMode } from '@omni-tars/core';
import { GUIAgentToolCallEngine } from './GUIAgentToolCallEngine';

export class GuiToolCallEngineProvider extends ToolCallEngineProvider<GUIAgentToolCallEngine> {
  readonly name = 'gui-tool-call-engine';
  readonly priority = 90; // High priority for GUI tasks
  readonly description =
    'Tool call engine optimized for GUI automation, computer use, and visual interface interactions';
  private agentMode: AgentMode;

  constructor(agentMode: AgentMode) {
    super();
    this.agentMode = agentMode;
  }

  protected createEngine(): GUIAgentToolCallEngine {
    return new GUIAgentToolCallEngine(this.agentMode);
  }

  canHandle(context: ToolCallEngineContext): boolean {
    //Check if any tools are GUI/computer use related
    if (context.toolCalls) {
      const toolNames = [
        'call_user',
        'click',
        'drag',
        'finished',
        'hotkey',
        'left_double',
        'mouse_down',
        'mouse_up',
        'move_to',
        'press',
        'release',
        'right_single',
        'scroll',
        'type',
        'wait',
      ];

      if (this.agentMode.id !== 'game') {
        toolNames.push('navigate');
        toolNames.push('navigate_back');
      }

      const hasGuiTools = context?.toolCalls?.some((tool) =>
        toolNames.some((guiName) =>
          tool.function.name.toLowerCase().includes(guiName.toLowerCase()),
        ),
      );

      return !!hasGuiTools;
    }

    // Fallback: Check if the latest model output contains <computer_env></computer_env> tags
    if (context.latestAssistantMessage) {
      const hasComputerEnvTags = context.latestAssistantMessage.includes('<computer_env>');
      if (hasComputerEnvTags) {
        return true;
      }
    }

    return false;
  }
}
