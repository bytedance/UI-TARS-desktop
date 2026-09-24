/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Agent } from '../src';
import { ContextCompressionOptions } from '@tarko/agent-interface';

/**
 * Example demonstrating context compression usage
 */
async function contextCompressionExample() {
  console.log('=== Context Compression Example ===\n');

  // Configure context compression options
  const contextCompressionOptions: ContextCompressionOptions = {
    enabled: true,
    level: 'moderate', // Options: 'none', 'conservative', 'moderate', 'aggressive'
    maxContextTokens: 8000, // Adjust based on your model's context window
    compressionThreshold: 0.8, // Trigger compression at 80% of max tokens
    targetCompressionRatio: 0.6, // Target 60% of max tokens after compression
    maxImages: 3, // Keep max 3 images in context
    maxToolResults: 5, // Keep max 5 tool results
    preserveRecent: true, // Preserve most recent messages
    recentMessageCount: 2, // Always keep last 2 conversation turns
  };

  // Create agent with context compression
  const agent = new Agent({
    name: 'Context Compression Demo',
    instructions: 'You are a helpful assistant that demonstrates context compression.',
    context: {
      contextCompression: contextCompressionOptions,
    },
    model: {
      provider: 'openai',
      id: 'gpt-4o-mini',
    },
  });

  console.log('Agent created with context compression enabled\n');

  try {
    // Simulate a long conversation that would trigger compression
    console.log('Starting conversation...');
    
    let response = await agent.run('Hello! I want to have a long conversation with you.');
    console.log('Assistant:', response.content);
    
    // Add more messages to build up context
    for (let i = 1; i <= 5; i++) {
      const userMessage = `This is message ${i}. Please tell me about topic ${i} in detail. I want comprehensive information that uses many tokens so we can demonstrate the context compression feature working effectively.`;
      
      console.log(`\nUser: ${userMessage}`);
      response = await agent.run(userMessage);
      console.log('Assistant:', response.content.substring(0, 100) + '...');
    }
    
    console.log('\n=== Context compression should be active now ===');
    console.log('The agent automatically manages context size to prevent overflow.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await agent.dispose();
  }
}

/**
 * Example showing custom compression strategies
 */
async function customStrategyExample() {
  console.log('\n=== Custom Strategy Example ===\n');

  // Import compression strategies
  const { SlidingWindowStrategy, ToolResultCompressionStrategy } = await import('../src/context-compression');

  // Create custom strategies
  const customStrategies = [
    new SlidingWindowStrategy(8, true), // Keep last 8 messages + system prompt
    new ToolResultCompressionStrategy(200, 0.5), // Compress tool results to 200 tokens max
  ];

  const agent = new Agent({
    name: 'Custom Strategy Demo',
    instructions: 'You demonstrate custom compression strategies.',
    context: {
      contextCompression: {
        enabled: true,
        customStrategies, // Use our custom strategies
        maxContextTokens: 4000,
      },
    },
    model: {
      provider: 'openai', 
      id: 'gpt-4o-mini',
    },
  });

  console.log('Agent created with custom compression strategies\n');

  try {
    const response = await agent.run('Tell me about custom compression strategies.');
    console.log('Assistant:', response.content);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await agent.dispose();
  }
}

/**
 * Example showing different compression levels
 */
async function compressionLevelsExample() {
  console.log('\n=== Compression Levels Example ===\n');

  const levels: Array<'conservative' | 'moderate' | 'aggressive'> = ['conservative', 'moderate', 'aggressive'];

  for (const level of levels) {
    console.log(`\n--- ${level.toUpperCase()} Compression ---`);
    
    const agent = new Agent({
      name: `${level} Compression Demo`,
      instructions: `You demonstrate ${level} compression.`,
      context: {
        contextCompression: {
          enabled: true,
          level,
          maxContextTokens: 2000, // Small context to trigger compression quickly
        },
      },
      model: {
        provider: 'openai',
        id: 'gpt-4o-mini',
      },
    });

    try {
      const response = await agent.run(`Explain the ${level} compression level.`);
      console.log('Assistant:', response.content.substring(0, 150) + '...');
    } catch (error) {
      console.error('Error:', error);
    } finally {
      await agent.dispose();
    }
  }
}

// Run examples
if (require.main === module) {
  (async () => {
    await contextCompressionExample();
    await customStrategyExample();
    await compressionLevelsExample();
  })().catch(console.error);
}

export {
  contextCompressionExample,
  customStrategyExample,
  compressionLevelsExample,
};
