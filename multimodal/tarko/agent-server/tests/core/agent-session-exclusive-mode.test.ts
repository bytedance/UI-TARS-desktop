/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentEventStream, AgentStatus } from '@tarko/interface';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentSession as LegacyAgentSession } from '../../src/core/AgentSession';
import { AgentSession as NextAgentSession } from '../../../agent-server-next/src/services/session/AgentSession';

vi.mock('../../../agent-server-next/src/utils/logger', () => ({
  getLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

type SystemEventData = Omit<AgentEventStream.SystemEvent, 'id' | 'type' | 'timestamp'>;

type TestSession = {
  agent: {
    run: (...args: unknown[]) => Promise<unknown>;
    status: () => AgentStatus;
    getEventStream: () => {
      createEvent: (type: 'system', data: SystemEventData) => AgentEventStream.SystemEvent;
    };
  };
  runQueryStreaming(options: { input: string }): Promise<AsyncIterable<AgentEventStream.Event>>;
};

type SessionConstructor = new (
  server: ReturnType<typeof createExclusiveServerStub>,
  sessionId: string,
) => TestSession;

const implementations: Array<[string, SessionConstructor]> = [
  ['agent-server', LegacyAgentSession as unknown as SessionConstructor],
  ['agent-server-next', NextAgentSession as unknown as SessionConstructor],
];

function createExclusiveServerStub() {
  let runningSessionId: string | null = null;

  return {
    isDebug: false,
    setRunningSession: vi.fn((sessionId: string) => {
      runningSessionId = sessionId;
    }),
    clearRunningSession: vi.fn((sessionId: string) => {
      if (runningSessionId === sessionId) {
        runningSessionId = null;
      }
    }),
    canAcceptNewRequest: vi.fn(() => runningSessionId === null),
    getRunningSessionId: vi.fn(() => runningSessionId),
  };
}

function createEventStream() {
  return {
    createEvent: vi.fn(
      (type: 'system', data: SystemEventData): AgentEventStream.SystemEvent => ({
        id: 'event-id',
        type,
        timestamp: Date.now(),
        ...data,
      }),
    ),
  };
}

async function collectEvents(stream: AsyncIterable<AgentEventStream.Event>) {
  const events: AgentEventStream.Event[] = [];
  for await (const event of stream) {
    events.push(event);
  }
  return events;
}

describe.each(implementations)('%s exclusive streaming lifecycle', (_, Session) => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('releases the slot immediately when the stream fails to start', async () => {
    const server = createExclusiveServerStub();
    const sessionId = 'failed-session';
    const session = new Session(server, sessionId);
    const eventStream = createEventStream();
    session.agent = {
      status: () => AgentStatus.IDLE,
      run: vi.fn().mockRejectedValue(new Error('startup failed')),
      getEventStream: () => eventStream,
    };

    const errorStream = await session.runQueryStreaming({ input: 'test' });

    expect(server.getRunningSessionId()).toBeNull();
    expect(server.canAcceptNewRequest()).toBe(true);
    expect(server.clearRunningSession).toHaveBeenCalledOnce();
    expect(server.clearRunningSession).toHaveBeenCalledWith(sessionId);

    server.setRunningSession(sessionId);
    const events = await collectEvents(errorStream);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: 'system',
      level: 'error',
      message: 'startup failed',
      details: { errorCode: 'AGENT_EXECUTION_ERROR' },
    });
    expect(server.getRunningSessionId()).toBe(sessionId);
    expect(server.clearRunningSession).toHaveBeenCalledOnce();
  });

  it('keeps the slot until a successfully started stream finishes', async () => {
    const server = createExclusiveServerStub();
    const sessionId = 'active-session';
    const session = new Session(server, sessionId);
    const eventStream = createEventStream();
    const sourceEvent = eventStream.createEvent('system', {
      level: 'info',
      message: 'running',
    });
    session.agent = {
      status: () => AgentStatus.IDLE,
      run: vi.fn().mockResolvedValue(
        (async function* () {
          yield sourceEvent;
        })(),
      ),
      getEventStream: () => eventStream,
    };

    const stream = await session.runQueryStreaming({ input: 'test' });

    expect(server.getRunningSessionId()).toBe(sessionId);
    expect(server.canAcceptNewRequest()).toBe(false);
    expect(server.clearRunningSession).not.toHaveBeenCalled();

    await expect(collectEvents(stream)).resolves.toEqual([sourceEvent]);
    expect(server.getRunningSessionId()).toBeNull();
    expect(server.canAcceptNewRequest()).toBe(true);
    expect(server.clearRunningSession).toHaveBeenCalledOnce();
    expect(server.clearRunningSession).toHaveBeenCalledWith(sessionId);
  });

  it('does not clear an active stream slot when an overlapping request is rejected', async () => {
    const server = createExclusiveServerStub();
    const sessionId = 'overlapping-session';
    const session = new Session(server, sessionId);
    const eventStream = createEventStream();
    let executing = false;
    let releaseStream: (() => void) | undefined;
    const streamGate = new Promise<void>(resolve => {
      releaseStream = resolve;
    });
    const sourceEvent = eventStream.createEvent('system', {
      level: 'info',
      message: 'running',
    });
    const sourceStream = (async function* () {
      await streamGate;
      executing = false;
      yield sourceEvent;
    })();

    session.agent = {
      status: () => (executing ? AgentStatus.EXECUTING : AgentStatus.IDLE),
      run: vi.fn().mockImplementation(async () => {
        if (executing) {
          throw new Error('already executing');
        }
        executing = true;
        return sourceStream;
      }),
      getEventStream: () => eventStream,
    };

    const activeStream = await session.runQueryStreaming({ input: 'first' });
    expect(server.getRunningSessionId()).toBe(sessionId);

    const rejectedStream = await session.runQueryStreaming({ input: 'second' });
    expect(server.getRunningSessionId()).toBe(sessionId);
    expect(server.clearRunningSession).not.toHaveBeenCalled();

    releaseStream?.();
    await expect(collectEvents(activeStream)).resolves.toEqual([sourceEvent]);
    await expect(collectEvents(rejectedStream)).resolves.toHaveLength(1);
    expect(server.getRunningSessionId()).toBeNull();
    expect(server.clearRunningSession).toHaveBeenCalledOnce();
  });
});
