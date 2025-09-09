const fs = require('fs');
const readline = require('readline');

// Utility function to truncate long strings
function truncateValue(value, maxLength = 100) {
  if (typeof value === 'string') {
    return value.length > maxLength ? value.substring(0, maxLength) + '...' : value;
  }
  if (typeof value === 'object' && value !== null) {
    if (Array.isArray(value)) {
      return `[Array(${value.length})]`;
    }
    const keys = Object.keys(value);
    const truncated = {};
    for (const key of keys) {
      const val = value[key];
      if (typeof val === 'string' && val.length > maxLength) {
        truncated[key] = val.substring(0, maxLength) + '...';
      } else if (typeof val === 'object' && val !== null) {
        if (Array.isArray(val)) {
          truncated[key] = `[Array(${val.length})]`;
        } else {
          const subKeys = Object.keys(val);
          truncated[key] = `{Object with keys: ${subKeys.join(', ')}}`;
        }
      } else {
        truncated[key] = val;
      }
    }
    return truncated;
  }
  return value;
}

// Analyze field lengths
function analyzeFieldLengths(obj, path = '') {
  const analysis = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;
    
    if (typeof value === 'string') {
      analysis[currentPath] = `string(${value.length})`;
    } else if (Array.isArray(value)) {
      analysis[currentPath] = `array(${value.length})`;
    } else if (typeof value === 'object' && value !== null) {
      analysis[currentPath] = `object(${Object.keys(value).length} keys)`;
      // Recursively analyze nested objects (but limit depth)
      if (path.split('.').length < 3) {
        Object.assign(analysis, analyzeFieldLengths(value, currentPath));
      }
    } else {
      analysis[currentPath] = typeof value;
    }
  }
  
  return analysis;
}

async function analyzeTraceFile() {
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
    
    try {
      const data = JSON.parse(line);
      
      console.log(`\n=== Line ${lineNumber} ===`);
      console.log('Field lengths analysis:');
      const analysis = analyzeFieldLengths(data);
      console.log(JSON.stringify(analysis, null, 2));
      
      console.log('\nTruncated data:');
      const truncated = truncateValue(data);
      console.log(JSON.stringify(truncated, null, 2));
      
      // Stop after first line for now
      break;
      
    } catch (error) {
      console.error(`Error parsing line ${lineNumber}:`, error.message);
    }
  }
}

// Get line number from command line argument
const lineToAnalyze = process.argv[2] ? parseInt(process.argv[2]) : 1;

async function analyzeSingleLine(targetLine) {
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
        
        console.log(`\n=== Analyzing Line ${lineNumber} ===`);
        console.log('Field lengths analysis:');
        const analysis = analyzeFieldLengths(data);
        console.log(JSON.stringify(analysis, null, 2));
        
        console.log('\nTruncated data:');
        const truncated = truncateValue(data);
        console.log(JSON.stringify(truncated, null, 2));
        
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

analyzeSingleLine(lineToAnalyze);
