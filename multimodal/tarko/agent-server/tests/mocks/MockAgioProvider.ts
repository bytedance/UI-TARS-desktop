/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgioEvent } from '@tarko/agio';
import { AgentEventStream, IAgent, AgentAppConfig } from '@tarko/interface';

/**
 * Mock AGIO Provider implementation for testing
 */
export class MockAgioProvider implements AgioEvent.AgioProvider {
  constructor(
    private providerUrl: string,
    private agentOptions: AgentAppConfig,
    private sessionId: string,
    private agent: IAgent,
  ) {}

  async sendAgentInitialized(): Promise<void> {
    // Mock implementation - no actual network calls
  }

  async processAgentEvent(event: AgentEventStream.Event): Promise<void> {
    // Mock implementation - no actual processing
  }

  async cleanup(): Promise<void> {
    // Mock implementation - no actual cleanup
  }
}
