import { AgentEventStream } from '@multimodal/agent-interface';
import type { AgentServerVersionInfo } from '@agent-tars/interface';

/**
 * Session metadata interface
 * Forked from server, we need move to interface later.
 */
export interface SessionMetadata {
  id: string;
  createdAt: number;
  updatedAt: number;
  name?: string;
  workingDirectory: string;
  tags?: string[];
}

declare global {
  interface Window {
    AGENT_BASE_URL?: string;
    AGENT_REPLAY_MODE?: boolean;
    AGENT_SESSION_DATA?: SessionMetadata;
    AGENT_EVENT_STREAM?: AgentEventStream.Event[];
    AGENT_VERSION_INFO?: AgentServerVersionInfo;
  }
}
