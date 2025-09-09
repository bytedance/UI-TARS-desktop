const fs = require('fs');
const readline = require('readline');

async function searchToolResults() {
  const fileStream = fs.createReadStream('agent_trace.jsonl');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let lineNumber = 0;
  const patterns = [
    'Tool:',
    'Result:',
    'tool_result',
    'function_result',
    'execute_bash',
    'str_replace_editor',
    'think',
    'STDOUT',
    'STDERR',
    'outputs',
    'inputs'
  ];
  
  console.log('Searching for tool results with various patterns...');
  
  for await (const line of rl) {
    lineNumber++;
    
    try {
      const event = JSON.parse(line);
      
      // Check the entire JSON string for patterns
      const jsonStr = JSON.stringify(event);
      
      for (const pattern of patterns) {
        if (jsonStr.includes(pattern)) {
          console.log(`Line ${lineNumber}: Found '${pattern}' in span ${event.span_id}`);
          
          // Show some context for interesting patterns
          if (pattern === 'STDOUT' || pattern === 'STDERR' || pattern === 'Result:') {
            const preview = jsonStr.substring(0, 300) + '...';
            console.log(`  Context: ${preview}`);
          }
          break; // Only report first match per line
        }
      }
      
      // Special check for specific structures
      if (event.attributes?.inputs) {
        console.log(`Line ${lineNumber}: Has inputs in span ${event.span_id}`);
        const inputsStr = JSON.stringify(event.attributes.inputs).substring(0, 200);
        console.log(`  Inputs preview: ${inputsStr}...`);
      }
      
      if (event.attributes?.outputs && !event.attributes.outputs.content) {
        console.log(`Line ${lineNumber}: Has outputs (non-content) in span ${event.span_id}`);
        const outputsStr = JSON.stringify(event.attributes.outputs).substring(0, 200);
        console.log(`  Outputs preview: ${outputsStr}...`);
      }
      
    } catch (error) {
      console.log(`Line ${lineNumber}: Parse error - ${error.message}`);
    }
    
    // Limit output to avoid overwhelming
    if (lineNumber > 50) {
      console.log('... (stopping at line 50 to avoid overflow)');
      break;
    }
  }
}

searchToolResults().catch(console.error);