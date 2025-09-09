const fs = require('fs');
const readline = require('readline');

// Get line number from command line argument
const lineToAnalyze = process.argv[2] ? parseInt(process.argv[2]) : 1;

async function analyzeSingleLineDetailed(targetLine) {
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
  
  let lineNumber = 0;
  
  for await (const line of rl) {
    lineNumber++;
    
    if (!line.trim()) continue;
    
    if (lineNumber === targetLine) {
      try {
        const data = JSON.parse(line);
        
        console.log(`\n=== Detailed Analysis of Line ${lineNumber} ===`);
        console.log('Type:', data.type);
        console.log('Span ID:', data.span_id);
        console.log('Name:', data.name || 'N/A');
        console.log('Time:', new Date(data.time_unix_nano / 1000000).toISOString());
        
        if (data.attributes) {
          console.log('\n--- Attributes ---');
          
          if (data.attributes.outputs) {
            console.log('\n--- Outputs ---');
            const outputs = data.attributes.outputs;
            
            if (outputs.content) {
              console.log('Content (first 200 chars):', outputs.content.substring(0, 200) + '...');
            }
            
            if (outputs.openai) {
              console.log('\nOpenAI Response:');
              if (outputs.openai.choices && outputs.openai.choices[0]) {
                const choice = outputs.openai.choices[0];
                console.log('- Message Content (first 200 chars):', 
                  choice.message?.content?.substring(0, 200) + '...' || 'N/A');
                console.log('- Finish Reason:', choice.finish_reason);
              }
              if (outputs.openai.usage) {
                console.log('- Usage:', JSON.stringify(outputs.openai.usage, null, 2));
              }
            }
            
            if (outputs.result) {
              console.log('\nTool Result:', outputs.result.substring(0, 200) + '...');
            }
            
            if (outputs.data) {
              console.log('\nTool Data:', JSON.stringify(outputs.data, null, 2));
            }
            
            if (Array.isArray(outputs)) {
              console.log('\nOutputs Array:');
              outputs.forEach((output, index) => {
                console.log(`Item ${index}:`, JSON.stringify(output, null, 2));
              });
            }
          }
          
          if (data.attributes.inputs) {
            console.log('\n--- Inputs ---');
            const inputs = data.attributes.inputs;
            
            if (inputs.messages) {
              console.log('Messages count:', inputs.messages.length);
              inputs.messages.forEach((msg, index) => {
                console.log(`Message ${index}:`, {
                  role: msg.role,
                  content: typeof msg.content === 'string' 
                    ? msg.content.substring(0, 100) + '...' 
                    : '[Complex Content]'
                });
              });
            }
          }
        }
        
        break;
        
      } catch (error) {
        console.error(`Error parsing line ${lineNumber}:`, error.message);
      }
    }
  }
  
  if (lineNumber < targetLine) {
    console.log(`File only has ${lineNumber} lines, but requested line ${targetLine}`);
  }
}

analyzeSingleLineDetailed(lineToAnalyze);
