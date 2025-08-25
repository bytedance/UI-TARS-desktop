import { processStreamingChunk, createInitState } from '../index';
import { createChunk, realStreamingChunks } from '../data/testData';

const state = createInitState();
const allUpdates: unknown[] = [];

console.log('Processing real streaming chunks...');

// Find code_env related chunks
const joinedChunks = realStreamingChunks.join('');
console.log('Full content contains code_env:', joinedChunks.includes('<code_env>'));

let chunkIndex = 0;
for (const chunk of realStreamingChunks) {
  if (chunk.includes('code') || chunk.includes('function') || chunk.includes('parameter')) {
    console.log(`Chunk ${chunkIndex}: "${chunk}"`);
  }

  const result = processStreamingChunk(createChunk(chunk), state);

  if (result.streamingToolCallUpdates && result.streamingToolCallUpdates.length > 0) {
    console.log(`Chunk ${chunkIndex} produced updates:`, result.streamingToolCallUpdates);
    allUpdates.push(...result.streamingToolCallUpdates);
  }

  // Log state changes
  if (state.insideCodeEnv || state.insideFunction || state.insideParameter) {
    console.log(
      `Chunk ${chunkIndex} state: codeEnv=${state.insideCodeEnv}, function=${state.insideFunction}, parameter=${state.insideParameter}`,
    );
  }

  chunkIndex++;
}

console.log('Final state.toolCalls:', JSON.stringify(state.toolCalls, null, 2));
console.log('Total streamingToolCallUpdates:', allUpdates.length);
