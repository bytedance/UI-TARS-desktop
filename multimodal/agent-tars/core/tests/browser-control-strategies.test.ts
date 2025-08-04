import { describe, it, expect } from 'vitest';
import { AgentTARS } from '../src/agent-tars';
import { BrowserControlMode } from '../src/types';
import { zodToJsonSchema } from '@tarko/mcp-agent';

describe('Browser Control Strategies', () => {
  // Helper function to extract tool information with minimal properties
  const extractToolInfo = (agent: AgentTARS) => {
    const tools = agent.getTools();
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.hasJsonSchema?.() ? tool.schema : zodToJsonSchema(tool.schema),
    }));
  };

  // Test each browser control mode
  it.each(['hybrid', 'dom', 'visual-grounding'] as BrowserControlMode[])(
    'should register correct tools for %s strategy',
    async (mode) => {
      // Create agent with specific browser control mode
      const agent = new AgentTARS({
        id: `test-agent-${mode}`,
        browser: {
          type: 'local',
          headless: true,
          control: mode,
        },
        mcpImpl: 'in-memory',
        instructions: 'Test instructions',
        model: {
          provider: 'volcengine', // Use a provider that supports all modes
          id: 'doubao-pro',
        },
      });

      try {
        // Initialize agent to register tools
        await agent.initialize();

        // Extract tool information
        const toolInfo = extractToolInfo(agent);

        // Get browser control info for additional verification
        const browserControlInfo = agent.getBrowserControlInfo();

        // Combine tool info with control info for complete snapshot
        const result = {
          mode: browserControlInfo.mode,
          registeredToolCount: toolInfo.length,
          browserSpecificTools: toolInfo.filter((t) => t.name.startsWith('browser_')),
        };

        // Create snapshot of the tool configuration
        await expect(result).toMatchFileSnapshot(`__snapshots__/browser_tools_${mode}.snap`);
      } finally {
        // Always clean up the agent resources
        await agent.cleanup();
      }
    },
  );
});
