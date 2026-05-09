import { Message, Session, AgentSettings } from '@/lib/types';
import { SYSTEM_PROMPT } from './prompt';

export interface AgentRunnerConfig {
  settings: AgentSettings;
  sessionId: string;
  onMessage: (message: Message) => void;
  onError: (error: Error) => void;
}

export class AgentRunner {
  private config: AgentRunnerConfig;
  private abortController: AbortController | null = null;

  constructor(config: AgentRunnerConfig) {
    this.config = config;
  }

  async run(userMessage: string, messages: Message[]): Promise<void> {
    this.abortController = new AbortController();

    try {
      // Format messages for API
      const apiMessages = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      // Add user message
      apiMessages.push({
        role: 'user',
        content: userMessage,
      });

      // Call streaming endpoint
      const response = await fetch(
        `/api/sessions/${this.config.sessionId}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userMessage,
            messages: apiMessages,
            settings: this.config.settings,
          }),
          signal: this.abortController.signal,
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      // Process streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'message') {
                this.config.onMessage(data.message);
              }
            } catch (e) {
              console.error('[v0] Failed to parse SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        this.config.onError(error);
      }
    }
  }

  abort(): void {
    this.abortController?.abort();
  }
}
