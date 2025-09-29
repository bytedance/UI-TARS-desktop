/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { nanoid } from 'nanoid';
import { AgentSession } from './AgentSession';
import { SandboxScheduler } from '../sandbox/SandboxScheduler';
import { getCurrentUser } from '../../middlewares/auth';
import type { AgentServer, UserInfo, HonoContext, ILogger } from '../../types';
import type { AgioProviderConstructor, SessionInfo } from '@tarko/interface';
import { ISessionDAO } from '../../dao';
import { getDefaultModel } from '../../utils/model-utils';
import { getLogger } from '../../utils/logger';

export interface CreateSessionOptions {
  sessionId?: string;
  userId?: string;
  user?: UserInfo;
  sessionInfo?: SessionInfo;
  agioProvider?: AgioProviderConstructor;
  context?: HonoContext;
}

/**
 * AgentSessionFactory - Factory for creating AgentSession instances with sandbox integration
 * Handles session creation, sandbox allocation, and user context
 */
export class AgentSessionFactory {
  private server: AgentServer;
  private sandboxScheduler?: SandboxScheduler;
  private logger: ILogger;
  private sessionDao: ISessionDAO;

  constructor(server: AgentServer, sandboxScheduler?: SandboxScheduler) {
    this.server = server;
    this.sandboxScheduler = sandboxScheduler;
    this.logger = getLogger('AgentSessionFactory');
    this.sessionDao = this.server.daoFactory.getSessionDAO();
  }

  /**
   * Create a new AgentSession with sandbox integration
   */
  async createSession(c: HonoContext): Promise<{
    session: AgentSession;
    sessionInfo?: SessionInfo;
    storageUnsubscribe?: () => void;
    events: any[]
  }> {
    const sessionId = nanoid();
    const user = getCurrentUser(c);
    const server = c.get('server');
    
    // Get runtimeSettings and agentOptions from request body
    const body = await c.req.json().catch(() => ({}));

    const { runtimeSettings, agentOptions } = body as {
      runtimeSettings?: Record<string, any>;
      agentOptions?: Record<string, any>;
    };

    // Allocate sandbox if scheduler is available
    let sandboxUrl: string | undefined;

    if (this.sandboxScheduler && user) {
      try {
        sandboxUrl = await this.sandboxScheduler.getSandboxUrl({
          userId: user.userId,
          sessionId,
        });
      } catch (error) {
        this.logger.error(`Failed to allocate sandbox for session ${sessionId}:`, error);
      }
    }

    this.logger.info('create new session using sandbox url: ', sandboxUrl);

    // Create session info for storage

    const now = Date.now();

    const defaultModel = getDefaultModel(server.appConfig);

    const newSessionInfo: SessionInfo = {
      id: sessionId,
      createdAt: now,
      updatedAt: now,
      workspace: this.server.getCurrentWorkspace(),
      userId: user?.userId,
      metadata: {
        agentInfo: {
          name: this.server.getCurrentAgentName()!,
          configuredAt: now,
        },
        ...(defaultModel && {
            modelConfig: defaultModel,
          }),
        sandboxUrl,
        // Include runtime settings if provided (persistent session settings)
        ...(runtimeSettings && {
          runtimeSettings,
        }),
        // Include agent options if provided (one-time initialization options)
        ...(agentOptions && {
          agentOptions,
        }),
      },
    };

    const savedSessionInfo = await this.sessionDao.createSession(newSessionInfo);

    // Create AgentSession instance with sandbox URL and agent options
    const session = this.createAgentSessionWithSandbox({
      sessionInfo: savedSessionInfo,
      agioProvider: this.server.getCustomAgioProvider(),
      agentOptions, // Pass one-time agent options
    });

    // Initialize the session
    const { storageUnsubscribe } = await session.initialize();
    

    // Wait a short time to ensure all initialization events are persisted
    // This handles the async nature of event storage during agent initialization
    await session.waitForEventSavesToComplete();

    // Get events that were created during agent initialization
    let initializationEvents = await server.daoFactory.getSessionEvents(sessionId);

    console.log('Return initializationEvents', initializationEvents);

    return {
      session,
      sessionInfo: savedSessionInfo,
      storageUnsubscribe,
      events: initializationEvents,
    };
  }

  /**
   * Restore existing session with sandbox reallocation if needed
   */
  async restoreSession(
    sessionId: string,
  ): Promise<{ session: AgentSession; storageUnsubscribe?: () => void } | null> {
    try {
      let sessionInfo = await this.sessionDao.getSessionInfo(sessionId);
      if (!sessionInfo) {
        return null;
      }

      // Reallocate sandbox if scheduler is available
      let old_sandboxUrl = sessionInfo.metadata?.sandboxUrl;
      const userId = sessionInfo.userId;

      if (this.sandboxScheduler && userId) {
        try {
          // check current sandbox status
          const exist = await this.sandboxScheduler.checkInstanceExist(old_sandboxUrl);

          if (!exist) {
            const newSandboxUrl = await this.sandboxScheduler.getSandboxUrl({
              userId,
              sessionId,
            });

            sessionInfo = await this.sessionDao.updateSessionInfo(sessionInfo.id, {
              ...sessionInfo,
              metadata: {
                ...sessionInfo.metadata,
                sandboxUrl: newSandboxUrl,
              },
            });

            this.logger.info(
              `session's sandbox url not existed, reallocate a sandbox: `,
              JSON.stringify({
                sessionId: sessionInfo.id,
                userId: sessionInfo.userId,
                oldSandbox: old_sandboxUrl,
                newSandbox: newSandboxUrl,
              }),
            );
          }
        } catch (error) {
          console.warn(`Failed to reallocate sandbox for session ${sessionId}:`, error);
        }
      }

      // Create and initialize session
      const session = this.createAgentSessionWithSandbox({
        sessionInfo,
        agioProvider: this.server.getCustomAgioProvider(),
        // No agentOptions for restored sessions - they are one-time initialization only
      });

      const { storageUnsubscribe } = await session.initialize();

      return { session, storageUnsubscribe };
    } catch (error) {
      console.error(`Failed to restore session ${sessionId}:`, error);
      return null;
    }
  }

  /**
   * Create AgentSession with sandbox URL injected
   */
  private createAgentSessionWithSandbox(options: {
    sessionInfo: SessionInfo;
    agioProvider?: AgioProviderConstructor;
    agentOptions?: Record<string, any>; // One-time agent initialization options
  }): AgentSession {
    const { sessionInfo, agioProvider, agentOptions } = options;

    const session = new AgentSession(this.server, sessionInfo.id, agioProvider, sessionInfo, agentOptions);

    return session;
  }

  /**
   * Update sandbox scheduler
   */
  setSandboxScheduler(scheduler: SandboxScheduler): void {
    this.sandboxScheduler = scheduler;
  }
}
