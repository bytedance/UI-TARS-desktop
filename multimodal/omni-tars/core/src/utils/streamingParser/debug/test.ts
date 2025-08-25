import { processStreamingChunk, createInitState } from '../index';
import { createChunk } from '../data/testData';

const state = createInitState();
const chunk = createChunk(`<code_env>
<function=str_replace_editor>
<parameter=command>create</parameter>
<parameter=path>/home/gem/fibonacci/fibonacci_function.py</parameter>
<parameter=file_text>xxx
</parameter>
</function>
</code_env>`);

const result = processStreamingChunk(chunk, state);

console.log('streamingToolCallUpdates count:', result.streamingToolCallUpdates?.length);
console.log('streamingToolCallUpdates:', JSON.stringify(result.streamingToolCallUpdates, null, 2));
console.log('result.toolCalls:', JSON.stringify(result.toolCalls, null, 2));
console.log('state.toolCalls:', JSON.stringify(state.toolCalls, null, 2));
console.log('insideFunction after:', state.insideFunction);
console.log('insideCodeEnv after:', state.insideCodeEnv);
console.log('insideParameter after:', state.insideParameter);
