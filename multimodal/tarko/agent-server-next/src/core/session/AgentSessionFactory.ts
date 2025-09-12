/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { nanoid } from 'nanoid';
import { AgentSession } from '../AgentSession';
import { SandboxScheduler } from '../sandbox/SandboxScheduler';
import { UserConfigService } from '../../services/UserConfigService';
import { getCurrentUser } from '../../middlewares/auth';
import type { AgentServer, UserInfo, HonoContext } from '../../types';
import type { AgioProviderConstructor, SessionInfo } from '@tarko/interface';

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

  constructor(server: AgentServer, sandboxScheduler?: SandboxScheduler) {
    this.server = server;
    this.sandboxScheduler = sandboxScheduler;
  }

  /**
   * Create a new AgentSession with sandbox integration
   */
  async createSession(c: HonoContext): Promise<{
    session: AgentSession;
    sessionInfo?: SessionInfo;
    storageUnsubscribe?: () => void;
  }> {
    const sessionId = nanoid();
    const user = getCurrentUser(c);

    // Allocate sandbox if scheduler is available
    let sandboxUrl: string | undefined;

    if (this.sandboxScheduler && user) {
      try {
        sandboxUrl = await this.sandboxScheduler.getSandboxUrl({
          userId: user.userId,
          sessionId,
        });
      } catch (error) {
        console.error(`Failed to allocate sandbox for session ${sessionId}:`, error);
      }
    }

    // Create session info for storage
    let savedSessionInfo: SessionInfo | undefined;

    if (this.server.storageProvider) {
      const now = Date.now();

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
          sandboxUrl,
        },
      };

      try {
        savedSessionInfo = await this.server.storageProvider.createSession(newSessionInfo);
      } catch (error) {
        console.error(`Failed to save session info for ${sessionId}:`, error);
      }
    }

    // Create AgentSession with sandbox URL
    const session = this.createAgentSessionWithSandbox({
      sessionId,
      sessionInfo: savedSessionInfo,
      sandboxUrl,
      agioProvider: this.server.getCustomAgioProvider(),
    });

    // Initialize the session
    const { storageUnsubscribe } = await session.initialize();

    return {
      session,
      sessionInfo: savedSessionInfo,
      storageUnsubscribe,
    };
  }

  /**
   * Restore existing session with sandbox reallocation if needed
   */
  async restoreSession(
    sessionId: string,
  ): Promise<{ session: AgentSession; storageUnsubscribe?: () => void } | null> {
    try {
      const sessionInfo = await this.server.storageProvider.getSessionInfo(sessionId);
      if (!sessionInfo) {
        return null;
      }

      // Reallocate sandbox if scheduler is available
      let sandboxUrl = sessionInfo.metadata?.sandboxUrl;
      const userId = sessionInfo.userId;

      if (this.sandboxScheduler && userId) {
        try {
          // check current sandbox status
          const exist = await this.sandboxScheduler.checkInstanceExist(sandboxUrl);

          if (!exist) {
            sandboxUrl = await this.sandboxScheduler.getSandboxUrl({
              userId,
              sessionId,
            });
          }
        } catch (error) {
          console.warn(`Failed to reallocate sandbox for session ${sessionId}:`, error);
        }
      }

      // Create and initialize session
      const session = this.createAgentSessionWithSandbox({
        sessionId,
        sandboxUrl,
        sessionInfo,
        agioProvider: this.server.getCustomAgioProvider(),
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
    sessionId: string;
    sessionInfo?: SessionInfo;
    sandboxUrl?: string;
    agioProvider?: AgioProviderConstructor;
  }): AgentSession {
    const { sessionId, sandboxUrl, sessionInfo, agioProvider } = options;

    // Create the session
    const session = new AgentSession(this.server, sessionId, agioProvider, sessionInfo);

    // Inject sandbox URL into agent if available
    if (sandboxUrl && 'aioSandboxUrl' in session.agent) {
      try {
        (session.agent as any).aioSandboxUrl = sandboxUrl;
        console.log(
          `[AgentSessionFactory] Injected sandbox URL for session ${sessionId}: ${sandboxUrl}`,
        );
      } catch (error) {
        console.warn(`Failed to inject sandbox URL for session ${sessionId}:`, error);
      }
    }

    return session;
  }

  /**
   * Update sandbox scheduler
   */
  setSandboxScheduler(scheduler: SandboxScheduler): void {
    this.sandboxScheduler = scheduler;
  }
}
