import { AgentEventStream } from '@tarko/agent-interface';
import type {
  AgentServerVersionInfo,
  AgentWebUIImplementation,
  SessionInfo,
} from '@tarko/interface';

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
