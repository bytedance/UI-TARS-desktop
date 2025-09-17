/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentSession } from '../../src/core/AgentSession';
import { MemoryStorageProvider } from '../../src/storage/MemoryStorageProvider';
import { MockAgent } from '../mocks/MockAgent';
import { AgentEventStream, SessionInfo } from '@tarko/interface';
import { AgentServer } from '../../src/server';

describe('AgentSession - Context Restore (Simplest Implementation)', () => {
  let mockServer: AgentServer;
  let storageProvider: MemoryStorageProvider;
  let session: AgentSession;
  const sessionId = 'test-session-restore';

  beforeEach(async () => {
    // Create storage provider
    storageProvider = new MemoryStorageProvider();
    await storageProvider.initialize();

    // @ts-expect-error
    mockServer = {
      storageProvider,
      appConfig: {
        workspace: '/tmp/test',
        model: {
          provider: 'openai',
          id: 'gpt-4',
        },
      },
      getCurrentAgentResolution: vi.fn().mockReturnValue({
        agentName: 'test-agent',
        agentConstructor: MockAgent,
      }),
      getCurrentAgentName: vi.fn().mockReturnValue('test-agent'),
      getCurrentWorkspace: vi.fn().mockReturnValue('/tmp/test'),
      setRunningSession: vi.fn(),
      clearRunningSession: vi.fn(),
      isDebug: false,
    };
  });

  afterEach(async () => {
    if (session) {
      await session.cleanup();
    }
    if (storageProvider) {
      await storageProvider.close();
    }
  });

  it('should restore events from storage when recreating agent', async () => {
    // Create session info
    const sessionInfo = await storageProvider.createSession({
      id: sessionId,
      workspace: '/tmp/test',
      metadata: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create some test events in storage
    const userEvent: AgentEventStream.UserMessageEvent = {
      id: 'event-1',
      type: 'user_message',
      timestamp: Date.now(),
      content: 'Hello, this is a test message',
    };

    const assistantEvent: AgentEventStream.AssistantMessageEvent = {
      id: 'event-2',
      type: 'assistant_message',
      timestamp: Date.now(),
      content: 'Hello! I understand your test message.',
      finishReason: 'stop',
    };

    // Save events to storage
    await storageProvider.saveEvent(sessionId, userEvent);
    await storageProvider.saveEvent(sessionId, assistantEvent);

    // Create session (this should restore events via EventStream constructor)
    session = new AgentSession(mockServer, sessionId, undefined, sessionInfo);
    await session.initialize();

    // Get the agent's event stream
    const eventStream = session.agent.getEventStream();
    const events = eventStream.getEvents();

    // Verify that events were restored
    expect(events.length).toBeGreaterThanOrEqual(2);

    // Find our test events
    const restoredUserEvent = events.find((e) => e.id === 'event-1');
    const restoredAssistantEvent = events.find((e) => e.id === 'event-2');

    expect(restoredUserEvent).toBeDefined();
    expect(restoredUserEvent?.type).toBe('user_message');
    expect((restoredUserEvent as AgentEventStream.UserMessageEvent)?.content).toBe(
      'Hello, this is a test message',
    );

    expect(restoredAssistantEvent).toBeDefined();
    expect(restoredAssistantEvent?.type).toBe('assistant_message');
    expect((restoredAssistantEvent as AgentEventStream.AssistantMessageEvent)?.content).toBe(
      'Hello! I understand your test message.',
    );
  });

  it('should not duplicate events when updating model config', async () => {
    // Create session info
    const sessionInfo = await storageProvider.createSession({
      id: sessionId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      workspace: '/tmp/test',
      metadata: {},
    });

    // Create initial session
    session = new AgentSession(mockServer, sessionId, undefined, sessionInfo);
    await session.initialize();

    // Simulate some interaction that creates events
    const eventStream = session.agent.getEventStream();
    const testEvent: AgentEventStream.UserMessageEvent = {
      id: 'test-event',
      type: 'user_message',
      timestamp: Date.now(),
      content: 'Test message before model update',
    };
    eventStream.sendEvent(testEvent);

    // Wait a bit to ensure event is processed
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Get initial event count from storage
    const initialEvents = await storageProvider.getSessionEvents(sessionId);
    const initialEventCount = initialEvents.length;

    // Update model config (this recreates the agent with EventStream initialEvents)
    const updatedSessionInfo: SessionInfo = {
      ...sessionInfo,
      metadata: {
        modelConfig: {
          provider: 'openai',
          id: 'gpt-3.5-turbo',
        },
      },
    };
    await session.updateModelConfig(updatedSessionInfo);

    // Wait a bit to ensure events are processed
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Check that events weren't duplicated in storage
    const finalEvents = await storageProvider.getSessionEvents(sessionId);
    expect(finalEvents.length).toBe(initialEventCount);

    // But the agent should still have access to all events
    const agentEvents = session.agent.getEventStream().getEvents();
    expect(agentEvents.length).toBeGreaterThanOrEqual(initialEventCount);
  });

  it('should handle empty storage gracefully', async () => {
    // Create session info without any stored events
    const sessionInfo = await storageProvider.createSession({
      id: sessionId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      workspace: '/tmp/test',
      metadata: {},
    });

    // Create session (should handle empty storage gracefully)
    session = new AgentSession(mockServer, sessionId, undefined, sessionInfo);
    await session.initialize();

    // Should not throw and should have minimal events
    const eventStream = session.agent.getEventStream();
    const events = eventStream.getEvents();

    // Should have at least the ready event or similar
    expect(events).toBeDefined();
    expect(Array.isArray(events)).toBe(true);
  });
});
