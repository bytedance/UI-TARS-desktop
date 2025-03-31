import { AppContext } from '@renderer/hooks/useAgentFlow';
import { AgentContext } from '../AgentFlow';
import { ipcClient } from '@renderer/api';
import { MCPServerName, Message, ToolCall } from '@agent-infra/shared';
import { chatMessageTool, idleTool } from './tools';
import { CompatibilityCallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { interceptToolCalls } from '@renderer/api/fileSystemInterceptor';

export class Executor {
  constructor(
    private appContext: AppContext,
    private agentContext: AgentContext,
    private abortSignal: AbortSignal,
  ) {}

  private systemPrompt = `You are a tool use expert. You should call the appropriate tools according to the aware status and environment information.You should not output any response text and only return the JSON.

<overall_principal>
- Must respond with a tool use (function calling); plain text responses are forbidden
- Do not mention any specific tool names to users in messages
- Carefully verify available tools; do not fabricate non-existent tools
- Follow the instructions carefully in the aware status.
- Don't repeat the same mean with aware status, you should select the appropriate tool.
- Don't ask user anything, just tell user what you will do next.If some points is not very clear, you should tell user your solution.Don't ask user anything, remember, you are a agent for user.
- You should only respond chat message after you have finished some tools and return the summary in chat message.
- You should not output any response text and only return the tool call.
- Don't output any file path in current machine and ensure the security in your message. Don't output any absolute path in your message.
</overall_principal>

<chat_message_tool>
message as summary in current step.Don't return message first when the step just started.

Notice, you should not output a lot of words in chat message, because the chat message is always summary words. If you want to write something in detail, please use \`write_file\` to write in by markdown file by default.

In chat message tool, you should add the files that has been created in the past steps, and put the complete file path in the \`attachments\` param.
<chat_message_tool>

<file_system_tool>
If you meet the file system permission denied, you should check if the dir or file exists and create it if not.

Before you interact with filesystem, you must list the allowed dirs and files and check if the dir or file exists and create it if not.Don't write file directly. You should write the file into a safe directory.

</file_system_tool>

<web_search_tool>
After \`web_search\` called, then you must select web page from the search result, then you see the detail of the page, please call browser tool to do it.
</web_search_tool>

<browser_tools>
use \`browser_navigate\` to enter the page detail.
use \`browser_scroll\` to scroll the page.When you use browser to enter the page detail, if the page content is partially visible, you should call browser tool to scroll to get more content, until the page content is fully visible.
use \`browser_click\` to click the element.
use \`browser_form_input_fill\` to fill the form.
use \`browser_select\` to select the element.
use \`browser_hover\` to hover the element.
use \`browser_evaluate\` to evaluate the element.
use \`browser_get_text\` to get the text of the element.
</browser_tool>

<commands_tool>
When you use commands, you must cd the allowed dir instead of cwd.
</commands_tool>

<language>
You should use the same language as the user input by default.
</language>`;

  public updateSignal(abortSignal: AbortSignal) {
    this.abortSignal = abortSignal;
  }

  async run(status: string) {
    const environmentInfo = await this.agentContext.getEnvironmentInfo(
      this.appContext,
      this.agentContext,
    );

    if (this.abortSignal.aborted) {
      return [];
    }

    const streamId = Math.random().toString(36).substring(7);
    return new Promise<ToolCall[]>(async (resolve, reject) => {
      const abortHandler = () => {
        ipcClient.abortRequest({ requestId: streamId });
        resolve([]);
      };

      const activeMcpSettings = await ipcClient
        .getActiveMcpSettings()
        .catch((e) => {
          console.error('Error getting active MCP settings', e);
          return {};
        });
      try {
        this.abortSignal.addEventListener('abort', abortHandler);

        const result = await ipcClient.askLLMTool({
          messages: [
            Message.systemMessage(this.systemPrompt),
            Message.userMessage(environmentInfo),
            Message.userMessage(`Aware status: ${status}`),
          ],
          tools: [idleTool, chatMessageTool],
          mcpServerKeys: [
            ...Object.values(MCPServerName),
            // user defined mcp servers
            ...Object.keys(activeMcpSettings),
          ],
          requestId: streamId,
        });

        const toolCalls = (result.tool_calls || []).filter(Boolean);

        // Intercept tool calls to check file permissions - this will block if permission is needed
        const interceptedToolCalls = await interceptToolCalls(toolCalls);

        resolve(interceptedToolCalls);
      } catch (error) {
        reject(error);
      } finally {
        this.abortSignal.removeEventListener('abort', abortHandler);
      }
    });
  }

  async executeTools(toolCalls: ToolCall[]) {
    if (this.abortSignal.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    return new Promise<z.infer<typeof CompatibilityCallToolResultSchema>[]>(
      async (resolve, reject) => {
        const abortHandler = () => {
          reject(new DOMException('Aborted', 'AbortError'));
        };

        try {
          this.abortSignal.addEventListener('abort', abortHandler);

          // Intercept tool calls to check file permissions - this will block if permission is needed
          const interceptedToolCalls = await interceptToolCalls(toolCalls);

          const result = await ipcClient.executeTool({
            toolCalls: interceptedToolCalls,
          });

          console.log('Execute result', JSON.stringify(result));
          if (this.abortSignal.aborted) {
            throw new DOMException('Aborted', 'AbortError');
          }
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.abortSignal.removeEventListener('abort', abortHandler);
        }
      },
    );
  }
}
