const fs = require('fs');
const readline = require('readline');

async function analyzeIncompleteTools() {
  const fileStream = fs.createReadStream('agent_trace.jsonl');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let lineNumber = 0;
  const toolCalls = new Map(); // span_id -> tool call info
  const toolResults = new Set(); // span_ids that have results
  
  console.log('Analyzing tool calls and results...');
  
  for await (const line of rl) {
    lineNumber++;
    
    try {
      const event = JSON.parse(line);
      
      // Check if this is a tool call
      if (event.attributes?.outputs?.content) {
        const content = event.attributes.outputs.content;
        
        // Look for function calls in content
        if (content.includes('<function=') || content.includes('tool_call')) {
          const spanId = event.span_id;
          
          // Extract function name if possible
          const functionMatch = content.match(/<function=([^>]+)>/);
          const functionName = functionMatch ? functionMatch[1] : 'unknown';
          
          toolCalls.set(spanId, {
            lineNumber,
            functionName,
            spanId,
            content: content.substring(0, 200) + (content.length > 200 ? '...' : '')
          });
          
          console.log(`Line ${lineNumber}: Found tool call '${functionName}' in span ${spanId}`);
        }
      }
      
      // Check if this is a tool result
      if (event.attributes?.inputs?.content) {
        const content = event.attributes.inputs.content;
        
        // Look for tool results
        if (content.includes('Tool:') || content.includes('Result:')) {
          const spanId = event.span_id;
          toolResults.add(spanId);
          
          console.log(`Line ${lineNumber}: Found tool result in span ${spanId}`);
        }
      }
      
      // Also check for tool results in other fields
      if (event.attributes?.tool_result || 
          (event.attributes && JSON.stringify(event.attributes).includes('Tool:'))) {
        const spanId = event.span_id;
        toolResults.add(spanId);
        console.log(`Line ${lineNumber}: Found tool result (alt format) in span ${spanId}`);
      }
      
    } catch (error) {
      console.log(`Line ${lineNumber}: Parse error - ${error.message}`);
    }
  }
  
  console.log('\n=== ANALYSIS RESULTS ===');
  console.log(`Total tool calls found: ${toolCalls.size}`);
  console.log(`Total tool results found: ${toolResults.size}`);
  
  // Find incomplete tool calls
  const incompleteTools = [];
  
  for (const [spanId, toolInfo] of toolCalls) {
    if (!toolResults.has(spanId)) {
      incompleteTools.push(toolInfo);
    }
  }
  
  console.log(`\nIncomplete tool calls: ${incompleteTools.length}`);
  
  if (incompleteTools.length > 0) {
    console.log('\n=== INCOMPLETE TOOL CALLS ===');
    incompleteTools.forEach(tool => {
      console.log(`\nSpan ID: ${tool.spanId}`);
      console.log(`Line: ${tool.lineNumber}`);
      console.log(`Function: ${tool.functionName}`);
      console.log(`Content preview: ${tool.content}`);
      console.log('---');
    });
  }
  
  return {
    totalToolCalls: toolCalls.size,
    totalToolResults: toolResults.size,
    incompleteTools
  };
}

analyzeIncompleteTools().catch(console.error);