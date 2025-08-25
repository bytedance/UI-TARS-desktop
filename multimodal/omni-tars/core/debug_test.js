import { createInitState, processStreamingChunk } from './src/utils/streamingParser.ts';

function chunker(content, finish_reason = '') {
  return { choices: [{ delta: { content }, finish_reason }] };
}

const state = createInitState();
const strs = ['<', 'think', '>', 'Great'];

strs.forEach((str, i) => {
  console.log(`\n=== Chunk ${i}: "${str}" ===`);
  console.log('Before - thinkBuffer:', JSON.stringify(state.thinkBuffer));
  console.log('Before - insideThink:', state.insideThink);
  console.log('Before - reasoningBuffer:', JSON.stringify(state.reasoningBuffer));
  
  const result = processStreamingChunk(chunker(str), state);
  
  console.log('After - thinkBuffer:', JSON.stringify(state.thinkBuffer));
  console.log('After - insideThink:', state.insideThink);
  console.log('After - reasoningBuffer:', JSON.stringify(state.reasoningBuffer));
  console.log('Result reasoningContent:', JSON.stringify(result.reasoningContent));
});
