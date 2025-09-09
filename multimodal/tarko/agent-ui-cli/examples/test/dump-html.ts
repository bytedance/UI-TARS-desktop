/**
 * HTML dump generator for visualizing transformed agent events
 */

import * as fs from 'fs';
import * as path from 'path';
import { transformAgentTrace, AgentEventStream } from './transformer';

/**
 * Generate HTML visualization for agent events
 */
function generateHTML(events: AgentEventStream.Event[]): string {
  const eventsByType = events.reduce(
    (acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Agent Trace Visualization</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 8px 8px 0 0;
        }
        .header h1 {
            margin: 0;
            font-size: 2em;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 30px;
            background: #f8f9fa;
        }
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 6px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            text-align: center;
        }
        .stat-number {
            font-size: 2em;
            font-weight: bold;
            color: #667eea;
        }
        .stat-label {
            color: #666;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .events-container {
            padding: 30px;
        }
        .event {
            margin-bottom: 20px;
            border: 1px solid #e1e5e9;
            border-radius: 6px;
            overflow: hidden;
        }
        .event-header {
            padding: 15px 20px;
            font-weight: 600;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .event-content {
            padding: 20px;
            background: #fafbfc;
            border-top: 1px solid #e1e5e9;
        }
        .event-user_message .event-header {
            background: #e3f2fd;
            color: #1565c0;
        }
        .event-assistant_message .event-header {
            background: #f3e5f5;
            color: #7b1fa2;
        }
        .event-assistant_thinking_message .event-header {
            background: #fff3e0;
            color: #ef6c00;
        }
        .event-tool_call .event-header {
            background: #e8f5e8;
            color: #2e7d32;
        }
        .event-tool_result .event-header {
            background: #f1f8e9;
            color: #558b2f;
        }
        .event-agent_run_start .event-header {
            background: #e0f2f1;
            color: #00695c;
        }
        .event-agent_run_end .event-header {
            background: #fce4ec;
            color: #c2185b;
        }
        .timestamp {
            font-family: 'Monaco', 'Consolas', monospace;
            font-size: 0.85em;
            color: #666;
        }
        .tool-calls {
            margin-top: 15px;
        }
        .tool-call {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 4px;
            padding: 10px;
            margin-bottom: 10px;
        }
        .tool-call-name {
            font-weight: bold;
            color: #495057;
        }
        .tool-args {
            margin-top: 8px;
            font-family: 'Monaco', 'Consolas', monospace;
            font-size: 0.9em;
            background: white;
            padding: 8px;
            border-radius: 3px;
            overflow-x: auto;
        }
        .content {
            white-space: pre-wrap;
            word-wrap: break-word;
            background: white;
            padding: 15px;
            border-radius: 4px;
            border: 1px solid #e1e5e9;
            font-family: 'Monaco', 'Consolas', monospace;
            font-size: 0.9em;
            line-height: 1.4;
        }
        .metadata {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 10px;
            margin-top: 15px;
        }
        .metadata-item {
            background: white;
            padding: 8px 12px;
            border-radius: 4px;
            border: 1px solid #e1e5e9;
            font-size: 0.85em;
        }
        .metadata-label {
            font-weight: 600;
            color: #495057;
        }
        .metadata-value {
            color: #6c757d;
        }
        .filter-buttons {
            margin-bottom: 20px;
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }
        .filter-btn {
            padding: 8px 16px;
            border: 1px solid #dee2e6;
            background: white;
            border-radius: 20px;
            cursor: pointer;
            font-size: 0.85em;
            transition: all 0.2s;
        }
        .filter-btn:hover {
            background: #f8f9fa;
        }
        .filter-btn.active {
            background: #667eea;
            color: white;
            border-color: #667eea;
        }
        .search-box {
            width: 100%;
            padding: 12px;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            font-size: 1em;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 Agent Trace Visualization</h1>
            <p>Transformed from agent_trace.jsonl to AgentEventStream format</p>
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-number">${events.length}</div>
                <div class="stat-label">Total Events</div>
            </div>
            ${Object.entries(eventsByType)
              .map(
                ([type, count]) => `
            <div class="stat-card">
                <div class="stat-number">${count}</div>
                <div class="stat-label">${type.replace(/_/g, ' ')}</div>
            </div>
            `,
              )
              .join('')}
        </div>
        
        <div class="events-container">
            <input type="text" class="search-box" placeholder="Search events..." id="searchBox">
            
            <div class="filter-buttons">
                <button class="filter-btn active" data-filter="all">All Events</button>
                ${Object.keys(eventsByType)
                  .map(
                    (type) => `
                <button class="filter-btn" data-filter="${type}">${type.replace(/_/g, ' ')}</button>
                `,
                  )
                  .join('')}
            </div>
            
            <div id="eventsContainer">
                ${events.map((event, index) => generateEventHTML(event, index)).join('')}
            </div>
        </div>
    </div>
    
    <script>
        // Event filtering and search functionality
        const filterButtons = document.querySelectorAll('.filter-btn');
        const searchBox = document.getElementById('searchBox');
        const eventsContainer = document.getElementById('eventsContainer');
        const allEvents = document.querySelectorAll('.event');
        
        let currentFilter = 'all';
        let currentSearch = '';
        
        function updateDisplay() {
            allEvents.forEach(event => {
                const eventType = event.classList[1].replace('event-', '');
                const eventText = event.textContent.toLowerCase();
                
                const matchesFilter = currentFilter === 'all' || eventType === currentFilter;
                const matchesSearch = currentSearch === '' || eventText.includes(currentSearch.toLowerCase());
                
                event.style.display = matchesFilter && matchesSearch ? 'block' : 'none';
            });
        }
        
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentFilter = btn.dataset.filter;
                updateDisplay();
            });
        });
        
        searchBox.addEventListener('input', (e) => {
            currentSearch = e.target.value;
            updateDisplay();
        });
        
        // Add click to expand/collapse functionality
        document.querySelectorAll('.event-header').forEach(header => {
            header.style.cursor = 'pointer';
            header.addEventListener('click', () => {
                const content = header.nextElementSibling;
                if (content && content.classList.contains('event-content')) {
                    content.style.display = content.style.display === 'none' ? 'block' : 'none';
                }
            });
        });
    </script>
</body>
</html>
`;

  return html;
}

/**
 * Generate HTML for a single event
 */
function generateEventHTML(event: AgentEventStream.Event, index: number): string {
  const timestamp = new Date(event.timestamp).toISOString();
  const eventClass = `event event-${event.type}`;

  let content = '';
  let metadata: Array<{ label: string; value: string }> = [];

  switch (event.type) {
    case 'user_message':
      const userEvent = event as AgentEventStream.UserMessageEvent;
      content =
        typeof userEvent.content === 'string'
          ? userEvent.content
          : JSON.stringify(userEvent.content, null, 2);
      break;

    case 'assistant_message':
      const assistantEvent = event as AgentEventStream.AssistantMessageEvent;
      content = assistantEvent.content;
      if (assistantEvent.toolCalls && assistantEvent.toolCalls.length > 0) {
        content +=
          '\n\n' +
          assistantEvent.toolCalls
            .map((tc) => `🔧 Tool Call: ${tc.function.name}\nArguments: ${tc.function.arguments}`)
            .join('\n\n');
      }
      metadata = [
        { label: 'Finish Reason', value: assistantEvent.finishReason || 'N/A' },
        { label: 'Message ID', value: assistantEvent.messageId || 'N/A' },
        { label: 'Tool Calls', value: assistantEvent.toolCalls?.length.toString() || '0' },
      ];
      break;

    case 'assistant_thinking_message':
      const thinkingEvent = event as AgentEventStream.AssistantThinkingMessageEvent;
      content = thinkingEvent.content;
      metadata = [
        { label: 'Complete', value: thinkingEvent.isComplete ? 'Yes' : 'No' },
        {
          label: 'Duration',
          value: thinkingEvent.thinkingDurationMs ? `${thinkingEvent.thinkingDurationMs}ms` : 'N/A',
        },
      ];
      break;

    case 'tool_call':
      const toolCallEvent = event as AgentEventStream.ToolCallEvent;
      content = `Tool: ${toolCallEvent.name}\nArguments: ${JSON.stringify(toolCallEvent.arguments, null, 2)}`;
      metadata = [
        { label: 'Tool Call ID', value: toolCallEvent.toolCallId },
        { label: 'Tool Name', value: toolCallEvent.name },
        { label: 'Start Time', value: new Date(toolCallEvent.startTime).toISOString() },
      ];
      break;

    case 'tool_result':
      const toolResultEvent = event as AgentEventStream.ToolResultEvent;
      content =
        typeof toolResultEvent.content === 'string'
          ? toolResultEvent.content
          : JSON.stringify(toolResultEvent.content, null, 2);
      metadata = [
        { label: 'Tool Call ID', value: toolResultEvent.toolCallId },
        { label: 'Tool Name', value: toolResultEvent.name },
        { label: 'Elapsed Time', value: `${toolResultEvent.elapsedMs}ms` },
        { label: 'Error', value: toolResultEvent.error || 'None' },
      ];
      break;

    case 'agent_run_start':
      const startEvent = event as AgentEventStream.AgentRunStartEvent;
      content = `Session: ${startEvent.sessionId}\nAgent: ${startEvent.agentName}\nModel: ${startEvent.modelDisplayName}`;
      metadata = [
        { label: 'Session ID', value: startEvent.sessionId },
        { label: 'Provider', value: startEvent.provider || 'N/A' },
        { label: 'Model', value: startEvent.model || 'N/A' },
      ];
      break;

    case 'agent_run_end':
      const endEvent = event as AgentEventStream.AgentRunEndEvent;
      content = `Session: ${endEvent.sessionId}\nStatus: ${endEvent.status}\nIterations: ${endEvent.iterations}`;
      metadata = [
        { label: 'Session ID', value: endEvent.sessionId },
        { label: 'Status', value: endEvent.status },
        { label: 'Iterations', value: endEvent.iterations.toString() },
        { label: 'Elapsed Time', value: `${endEvent.elapsedMs}ms` },
      ];
      break;

    default:
      content = JSON.stringify(event, null, 2);
  }

  return `
    <div class="${eventClass}">
      <div class="event-header">
        <span>${index + 1}. ${event.type.replace(/_/g, ' ')}</span>
        <span class="timestamp">${timestamp}</span>
      </div>
      <div class="event-content">
        <div class="content">${content}</div>
        ${
          metadata.length > 0
            ? `
        <div class="metadata">
          ${metadata
            .map(
              (item) => `
          <div class="metadata-item">
            <div class="metadata-label">${item.label}</div>
            <div class="metadata-value">${item.value}</div>
          </div>
          `,
            )
            .join('')}
        </div>
        `
            : ''
        }
      </div>
    </div>
  `;
}

/**
 * Main function to generate HTML dump
 */
export async function generateHTMLDump(): Promise<void> {
  const jsonlPath = path.join(__dirname, 'agent_trace.jsonl');

  if (!fs.existsSync(jsonlPath)) {
    console.error('agent_trace.jsonl not found');
    return;
  }

  console.log('Reading agent_trace.jsonl...');
  const jsonlContent = fs.readFileSync(jsonlPath, 'utf-8');

  console.log('Transforming events...');
  const events = transformAgentTrace(jsonlContent);

  console.log(`Transformed ${events.length} events`);

  console.log('Generating HTML...');
  const html = generateHTML(events);

  const outputPath = path.join(__dirname, 'agent_trace_visualization.html');
  fs.writeFileSync(outputPath, html);

  console.log(`HTML visualization saved to ${outputPath}`);
  console.log('Open the file in a web browser to view the visualization.');
}

if (require.main === module) {
  generateHTMLDump().catch(console.error);
}
