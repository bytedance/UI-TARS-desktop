import { atom } from 'jotai';
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
 * Atom for model info (provider and model name)
 */
export const modelInfoAtom = atom<ModelInfo>({
  provider: '',
  model: '',
});

/**
 * Atom for agent info (agent name)
 */
export const agentInfoAtom = atom<AgentInfo>({
  name: 'Unknown Agent',
});

/**
 * Atom for workspace info (workspace name and path)
 */
export const workspaceInfoAtom = atom<WorkspaceInfo>({
  name: 'Unknown',
  path: '',
});

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
 * Atom for tracking processing status (when agent is running)
 */
export const isProcessingAtom = atom<boolean>(false);

/**
 * Atom for offline mode state (view-only when disconnected)
 */
export const offlineModeAtom = atom<boolean>(false);
