import { AgentEventStream } from '@tarko/agent-interface';
import type { AgentServerVersionInfo, AgentWebUIImplementation } from '@agent-tars/interface';

/**
 * Session metadata interface
 * Forked from server, we need move to interface later.
 */
export interface SessionInfo {
  id: string;
  createdAt: number;
  updatedAt: number;
  name?: string;
  workspace: string;
  tags?: string[];
}

/**
 * FIXME: move to Agent Server.
 */
declare global {
  interface Window {
    AGENT_BASE_URL?: string;
    AGENT_WEB_UI_CONFIG?: AgentWebUIImplementation;
    AGENT_REPLAY_MODE?: boolean;
    AGENT_SESSION_DATA?: SessionInfo;
    AGENT_EVENT_STREAM?: AgentEventStream.Event[];
    AGENT_VERSION_INFO?: AgentServerVersionInfo;
  }
}
