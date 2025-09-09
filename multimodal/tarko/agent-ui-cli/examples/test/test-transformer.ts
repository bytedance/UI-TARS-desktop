/**
 * Test script for the agent trace transformer
 */

import * as fs from 'fs';
import * as path from 'path';
import { transformAgentTrace, AgentEventStream } from './transformer';

/**
 * Test the transformer with the agent_trace.jsonl file
 */
async function testTransformer() {
  const jsonlPath = path.join(__dirname, 'agent_trace.jsonl');

  if (!fs.existsSync(jsonlPath)) {
    console.error('agent_trace.jsonl not found');
    return;
  }

  console.log('Reading agent_trace.jsonl...');
  const jsonlContent = fs.readFileSync(jsonlPath, 'utf-8');

  console.log('Transforming events...');
  const events = transformAgentTrace(jsonlContent);

  console.log(`\nTransformed ${events.length} events:`);

  // Group events by type
  const eventsByType = events.reduce(
    (acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  console.log('\nEvent type distribution:');
  Object.entries(eventsByType).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });

  // Show first few events
  console.log('\nFirst 5 events:');
  events.slice(0, 5).forEach((event, index) => {
    console.log(`\n${index + 1}. ${event.type} (${new Date(event.timestamp).toISOString()})`);

    if (event.type === 'assistant_message') {
      const assistantEvent = event as any;
      console.log(`   Content: ${assistantEvent.content?.substring(0, 100)}...`);
      if (assistantEvent.toolCalls) {
        console.log(`   Tool calls: ${assistantEvent.toolCalls.length}`);
      }
    } else if (event.type === 'tool_call') {
      const toolEvent = event as any;
      console.log(`   Tool: ${toolEvent.name}`);
      console.log(`   Args: ${JSON.stringify(toolEvent.arguments)}`);
    } else if (event.type === 'tool_result') {
      const resultEvent = event as any;
      console.log(`   Tool: ${resultEvent.name}`);
      console.log(
        `   Content: ${typeof resultEvent.content === 'string' ? resultEvent.content.substring(0, 100) + '...' : '[Object]'}`,
      );
      console.log(`   Elapsed: ${resultEvent.elapsedMs}ms`);
    }
  });

  // Save transformed events to JSON for inspection
  const outputPath = path.join(__dirname, 'transformed_events.json');
  fs.writeFileSync(outputPath, JSON.stringify(events, null, 2));
  console.log(`\nTransformed events saved to ${outputPath}`);

  return events;
}

if (require.main === module) {
  testTransformer().catch(console.error);
}

export { testTransformer };
