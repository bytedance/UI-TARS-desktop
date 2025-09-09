const fs = require('fs');
const readline = require('readline');

async function analyzePatterns() {
  const filePath = './agent_trace.jsonl';
  
  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    return;
  }
  
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  
  const patterns = {
    types: {},
    names: {},
    spanRelations: {},
    eventSequences: []
  };
  
  let lineNumber = 0;
  let lastEvent = null;
  
  for await (const line of rl) {
    lineNumber++;
    
    if (!line.trim()) continue;
    
    try {
      const data = JSON.parse(line);
      
      // Count types
      patterns.types[data.type] = (patterns.types[data.type] || 0) + 1;
      
      // Count names
      if (data.name) {
        patterns.names[data.name] = (patterns.names[data.name] || 0) + 1;
      }
      
      // Track span relationships
      if (data.parent_span_id) {
        const relation = `${data.parent_span_id} -> ${data.span_id}`;
        patterns.spanRelations[relation] = (patterns.spanRelations[relation] || 0) + 1;
      }
      
      // Track event sequences
      const eventInfo = {
        line: lineNumber,
        type: data.type,
        name: data.name,
        span_id: data.span_id,
        parent_span_id: data.parent_span_id,
        hasOutputs: !!(data.attributes && data.attributes.outputs),
        hasInputs: !!(data.attributes && data.attributes.inputs)
      };
      
      patterns.eventSequences.push(eventInfo);
      
      // Special analysis for tool-related events
      if (data.attributes && data.attributes.outputs) {
        const outputs = data.attributes.outputs;
        
        if (outputs.content && outputs.content.includes('<function=')) {
          console.log(`\nLine ${lineNumber}: Assistant message with function call`);
          console.log(`  Span: ${data.span_id}`);
          console.log(`  Content preview: ${outputs.content.substring(0, 100)}...`);
        }
        
        if (Array.isArray(outputs) && outputs[0] && outputs[0].tool) {
          console.log(`\nLine ${lineNumber}: Tool call parsed`);
          console.log(`  Span: ${data.span_id}`);
          console.log(`  Tool: ${outputs[0].tool.name}`);
          console.log(`  Params:`, outputs[0].params);
        }
        
        if (outputs.result && outputs.data) {
          console.log(`\nLine ${lineNumber}: Tool execution result`);
          console.log(`  Span: ${data.span_id}`);
          console.log(`  Status: ${outputs.data.status}`);
          console.log(`  Result preview: ${outputs.result.substring(0, 100)}...`);
        }
      }
      
      lastEvent = eventInfo;
      
    } catch (error) {
      console.error(`Error parsing line ${lineNumber}:`, error.message);
    }
  }
  
  console.log('\n\n=== ANALYSIS SUMMARY ===');
  console.log('\nEvent Types:');
  Object.entries(patterns.types).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });
  
  console.log('\nSpan Names:');
  Object.entries(patterns.names).forEach(([name, count]) => {
    console.log(`  ${name}: ${count}`);
  });
  
  console.log(`\nTotal lines processed: ${lineNumber}`);
  console.log(`Total events: ${patterns.eventSequences.length}`);
}

analyzePatterns();
