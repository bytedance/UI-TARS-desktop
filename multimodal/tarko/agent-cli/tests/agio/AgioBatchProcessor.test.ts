/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import { AgioBatchProcessor, AgioBatchProcessorOptions } from '../../src/agio/AgioBatchProcessor';
import { AgioEvent } from '@tarko/agio';

// Mock fetch
global.fetch = vi.fn();

const createEvent = (name: string): AgioEvent.ExtendedEvent => ({
  // @ts-expect-error
  type: name,
  sessionId: 'test-session',
  timestamp: Date.now(),
});

describe('AgioBatchProcessor', () => {
  const mockProviderUrl = 'http://localhost:9999/agio';
  const defaultOptions: AgioBatchProcessorOptions = {
    providerUrl: mockProviderUrl,
    maxBatchSize: 5,
    flushInterval: 100,
    requestTimeout: 50,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    (global.fetch as Mock).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should buffer events and not send immediately', () => {
    const processor = new AgioBatchProcessor(defaultOptions);
    processor.addEvent(createEvent('test_event_1'));
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should flush when maxBatchSize is reached', async () => {
    (fetch as Mock).mockResolvedValue({ ok: true });
    const processor = new AgioBatchProcessor(defaultOptions);

    for (let i = 0; i < 5; i++) {
      processor.addEvent(createEvent(`event_${i}`));
    }

    expect(fetch).toHaveBeenCalledTimes(1);
    const fetchCall = (fetch as Mock).mock.calls[0];
    expect(fetchCall[0]).toBe(mockProviderUrl);
    const body = JSON.parse(fetchCall[1].body);
    expect(body.events).toHaveLength(5);
  });

  it('should flush after flushInterval', async () => {
    (fetch as Mock).mockResolvedValue({ ok: true });
    const processor = new AgioBatchProcessor(defaultOptions);
    processor.addEvent(createEvent('test_event_1'));
    processor.addEvent(createEvent('test_event_2'));

    expect(fetch).not.toHaveBeenCalled();

    vi.advanceTimersByTime(101);

    expect(fetch).toHaveBeenCalledTimes(1);
    const fetchCall = (fetch as Mock).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body.events).toHaveLength(2);
  });

  it('should reset timer after a flush due to batch size', () => {
    (fetch as Mock).mockResolvedValue({ ok: true });
    const processor = new AgioBatchProcessor(defaultOptions);

    for (let i = 0; i < 5; i++) {
      processor.addEvent(createEvent(`event_${i}`));
    }
    expect(fetch).toHaveBeenCalledTimes(1);

    // Add another event to start a new batch and timer
    processor.addEvent(createEvent('event_6'));
    expect(fetch).toHaveBeenCalledTimes(1); // Should not flush yet

    vi.advanceTimersByTime(101);
    expect(fetch).toHaveBeenCalledTimes(2);
    const fetchCall = (fetch as Mock).mock.calls[1];
    const body = JSON.parse(fetchCall[1].body);
    expect(body.events).toHaveLength(1);
  });

  it('should handle manual flush correctly', async () => {
    (fetch as Mock).mockResolvedValue({ ok: true });
    const processor = new AgioBatchProcessor(defaultOptions);
    processor.addEvent(createEvent('manual_flush_event'));

    await processor.flush();

    expect(fetch).toHaveBeenCalledTimes(1);
    const fetchCall = (fetch as Mock).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body.events).toHaveLength(1);

    // Buffer should be empty now
    (fetch as Mock).mockClear();
    await processor.flush();
    expect(fetch).not.toHaveBeenCalled();
  });
});
