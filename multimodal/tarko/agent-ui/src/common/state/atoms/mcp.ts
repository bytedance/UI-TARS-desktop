import { atom } from 'jotai';
import type { MCPServer } from '@/common/types/mcp';

/**
 * Atom for storing all MCP servers
 */
export const mcpServersAtom = atom<MCPServer[]>([]);

/**
 * Atom for the currently selected server name
 */
export const selectedServerAtom = atom<string | null>(null);

/**
 * Atom for MCP loading state
 */
export const mcpLoadingAtom = atom<boolean>(false);

/**
 * Atom for MCP error state
 */
export const mcpErrorAtom = atom<string | null>(null);

/**
 * Derived atom for selected server details
 */
export const selectedServerDetailsAtom = atom((get) => {
  const servers = get(mcpServersAtom);
  const selectedName = get(selectedServerAtom);
  if (!selectedName) return null;
  return servers.find((s) => s.name === selectedName) || null;
});

/**
 * Atom for search/filter query
 */
export const mcpSearchQueryAtom = atom<string>('');

/**
 * Derived atom for filtered servers based on search query
 */
export const filteredServersAtom = atom((get) => {
  const servers = get(mcpServersAtom);
  const query = get(mcpSearchQueryAtom);
  
  if (!query.trim()) return servers;
  
  const lowerQuery = query.toLowerCase();
  return servers.filter(
    (server) =>
      server.name.toLowerCase().includes(lowerQuery) ||
      server.type.toLowerCase().includes(lowerQuery) ||
      server.status.toLowerCase().includes(lowerQuery)
  );
});