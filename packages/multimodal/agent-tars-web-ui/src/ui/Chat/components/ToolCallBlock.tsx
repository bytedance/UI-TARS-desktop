import type { ToolCall } from '../types';

interface ToolCallBlockProps {
  toolCall: ToolCall;
}

export function ToolCallBlock({ toolCall }: ToolCallBlockProps) {
  console.log('toolCall', toolCall);

  return (
    <div className="tool-call-block">
      <div className="tool-call-header">
        <span className="tool-name">🔧 {toolCall.name}</span>
        <span className="tool-status">{toolCall.error ? '❌' : toolCall.result ? '✅' : '⏳'}</span>
      </div>
      <div className="tool-call-content">
        <div className="tool-args">{toolCall.arguments.query || toolCall.arguments.task}</div>
        {toolCall.result && <div className="tool-result">{JSON.stringify(toolCall.result)}</div>}
        {toolCall.error && <div className="tool-error">{toolCall.error}</div>}
      </div>
    </div>
  );
}
