import { atom } from 'jotai';
import { AgentProcessingPhase, AgentStatusInfo, SessionItemInfo } from '@tarko/interface';
import {
  ConnectionStatus,
  PanelContent,
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
 * Session metadata atom using server-side SessionItemInfo metadata type
 * This eliminates type duplication and ensures consistency with persistence layer
 */
export const sessionMetadataAtom = atom<SessionItemInfo['metadata']>({});

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
  },
);

/**
 * Atom for offline mode state (view-only when disconnected)
 */
export const offlineModeAtom = atom<boolean>(false);
