import { atom } from 'jotai';
import { AgentProcessingPhase, AgentStatusInfo } from '@tarko/interface';
import {
  ConnectionStatus,
  ModelInfo,
  PanelContent,
  AgentInfo,
  WorkspaceInfo,
  SanitizedAgentOptions,
} from '@/common/types';

/**
 * Atom for the content currently displayed in the panel
 */
export const activePanelContentAtom = atom<PanelContent | null>(null);

/**
 * Atom for server connection status
 */
export const connectionStatusAtom = atom<ConnectionStatus>({
  connected: false,
  lastConnected: null,
  lastError: null,
  reconnecting: false,
});

/**
 * Consolidated session metadata atom combining model, agent, and workspace info
 */
export interface SessionMetadata {
  model: ModelInfo;
  agent: AgentInfo;
  workspace: WorkspaceInfo;
}

export const sessionMetadataAtom = atom<SessionMetadata>({
  model: {
    provider: '',
    model: '',
    displayName: '',
  },
  agent: {
    name: 'Unknown Agent',
  },
  workspace: {
    name: 'Unknown',
    path: '',
  },
});

/**
 * Derived atoms for backward compatibility
 */
export const modelInfoAtom = atom(
  (get) => get(sessionMetadataAtom).model,
  (get, set, update: ModelInfo) => {
    set(sessionMetadataAtom, (prev) => ({ ...prev, model: update }));
  }
);

export const agentInfoAtom = atom(
  (get) => get(sessionMetadataAtom).agent,
  (get, set, update: AgentInfo) => {
    set(sessionMetadataAtom, (prev) => ({ ...prev, agent: update }));
  }
);

export const workspaceInfoAtom = atom(
  (get) => get(sessionMetadataAtom).workspace,
  (get, set, update: WorkspaceInfo) => {
    set(sessionMetadataAtom, (prev) => ({ ...prev, workspace: update }));
  }
);

/**
 * Atom for agent options (sanitized configuration)
 */
export const agentOptionsAtom = atom<SanitizedAgentOptions>({});

/**
 * Atom for sidebar collapsed state
 */
export const sidebarCollapsedAtom = atom<boolean>(true);

/**
 * Atom for workspace panel collapsed state
 */
export const workspacePanelCollapsedAtom = atom<boolean>(false);

/**
 * Enhanced agent status atom for TTFT optimization
 * Replaces the redundant isProcessingAtom
 */
export const agentStatusAtom = atom<AgentStatusInfo>({
  isProcessing: false,
});

/**
 * Derived atom for backward compatibility
 */
export const isProcessingAtom = atom(
  (get) => get(agentStatusAtom).isProcessing,
  (get, set, update: boolean) => {
    set(agentStatusAtom, (prev) => ({ ...prev, isProcessing: update }));
  }
);

/**
 * Atom for offline mode state (view-only when disconnected)
 */
export const offlineModeAtom = atom<boolean>(false);
