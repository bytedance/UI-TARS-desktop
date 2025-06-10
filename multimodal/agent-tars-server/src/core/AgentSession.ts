/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import {
  AgentTARS,
  AgentEventStream,
  AgentStatus,
  AgioProviderImpl,
  ChatCompletionContentPart,
} from '@agent-tars/core';
import { AgentSnapshot } from '@multimodal/agent-snapshot';
import { EventStreamBridge } from '../utils/event-stream';
import { AgioProvider as DefaultAgioProviderImpl } from './AgioProvider';
import type { AgentTARSServer } from '../server';
import { AgioEvent } from '@multimodal/agio';

/**
 * AgentSession - Represents a single agent execution context
 *
 * Responsible for:
 * - Managing an AgentTARS instance and its lifecycle
 * - Connecting agent events to clients via EventStreamBridge
 * - Handling queries and interactions with the agent
 * - Persisting events to storage
 * - Collecting AGIO monitoring events if configured
 */

export class AgentSession {
  id: string;
  agent: AgentTARS;
  eventBridge: EventStreamBridge;
  private unsubscribe: (() => void) | null = null;
  private agioProvider?: AgioEvent.AgioProvider;

  constructor(
    private server: AgentTARSServer,
    sessionId: string,
    agioProviderImpl?: AgioProviderImpl,
  ) {
    this.id = sessionId;
    this.eventBridge = new EventStreamBridge();

    const { appConfig } = server;
    const { workspace, server: appServerConfig } = appConfig;

    // Initialize agent with merged config
    const agent = new AgentTARS(server.appConfig);

    // Initialize agent snapshot if enabled
    if (appConfig.snapshot?.enable) {
      const snapshotPath =
        appConfig.snapshot.snapshotPath || path.join(workspace!.workingDirectory!, 'snapshots');
      this.agent = new AgentSnapshot(agent, {
        snapshotPath,
        snapshotName: sessionId,
      }) as unknown as AgentTARS;

      agent.logger.debug(`AgentSnapshot initialized with path: ${snapshotPath}`);
    } else {
      this.agent = agent;
    }

    // Initialize AGIO collector if provider URL is configured
    if (appConfig.agio?.provider) {
      const impl = agioProviderImpl ?? DefaultAgioProviderImpl;
      this.agioProvider = new impl(appConfig.agio?.provider, appConfig, sessionId, agent);
      agent.logger.debug(`AGIO collector initialized with provider: ${appConfig.agio.provider}`);
    }

    agent.logger.info('Agent Config', JSON.stringify(agent.getOptions(), null, 2));
  }

  /**
   * Get the current processing status of the agent
   * @returns Whether the agent is currently processing a request
   */
  getProcessingStatus(): boolean {
    return this.agent.status() === AgentStatus.EXECUTING;
  }

  async initialize() {
    await this.agent.initialize();

    // Send agent initialization event to AGIO if configured
    if (this.agioProvider) {
      try {
        await this.agioProvider.sendAgentInitialized();
      } catch (error) {
        console.error('Failed to send AGIO initialization event:', error);
      }
    }

    // Connect to agent's event stream manager
    const agentEventStream = this.agent.getEventStream();

    // Create an event handler that saves events to storage and processes AGIO events
    const handleEvent = async (event: AgentEventStream.Event) => {
      // If we have storage, save the event
      if (this.server.storageProvider) {
        try {
          await this.server.storageProvider.saveEvent(this.id, event);
        } catch (error) {
          console.error(`Failed to save event to storage: ${error}`);
        }
      }

      // Process AGIO events if collector is configured
      if (this.agioProvider) {
        try {
          await this.agioProvider.processAgentEvent(event);
        } catch (error) {
          console.error('Failed to process AGIO event:', error);
        }
      }
    };

    // Subscribe to events for storage and AGIO processing
    const storageUnsubscribe = agentEventStream.subscribe(handleEvent);

    // Connect to event bridge for client communication
    this.unsubscribe = this.eventBridge.connectToAgentEventStream(agentEventStream);

    // Notify client that session is ready
    this.eventBridge.emit('ready', { sessionId: this.id });

    return { storageUnsubscribe };
  }

  async runQuery(query: string | ChatCompletionContentPart[]) {
    try {
      // Run agent to process the query
      const answer = await this.agent.run({
        input: query,
      });
      return answer;
    } catch (error) {
      this.eventBridge.emit('error', {
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async runQueryStreaming(
    query: string | ChatCompletionContentPart[],
  ): Promise<AsyncIterable<AgentEventStream.Event>> {
    try {
      // Run agent in streaming mode
      return await this.agent.run({
        input: query,
        stream: true,
      });
    } catch (error) {
      this.eventBridge.emit('error', {
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Abort the currently running query
   * @returns True if the agent was running and aborted successfully
   */
  async abortQuery(): Promise<boolean> {
    try {
      const aborted = this.agent.abort();
      if (aborted) {
        this.eventBridge.emit('aborted', { sessionId: this.id });
      }
      return aborted;
    } catch (error) {
      this.eventBridge.emit('error', {
        message: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  async cleanup() {
    // Unsubscribe from event stream
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    // Clean up agent resources
    await this.agent.cleanup();

    if (this.agioProvider) {
      // This ensures that all buffered analytics events are sent before the session is terminated.
      await this.agioProvider.cleanup?.();
    }

    this.eventBridge.emit('closed', { sessionId: this.id });
  }
}

export default AgentSession;
