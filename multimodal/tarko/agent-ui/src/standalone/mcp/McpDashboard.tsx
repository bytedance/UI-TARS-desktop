import React, { useEffect, useState } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { FiPlus, FiTrash, FiRefreshCw, FiSearch, FiServer } from 'react-icons/fi';
import {
  mcpServersAtom,
  mcpLoadingAtom,
  mcpErrorAtom,
  mcpSearchQueryAtom,
  filteredServersAtom,
} from '@/common/state/atoms/mcp';
import { mcpService } from '@/common/services/mcpService';
import { ServerCard } from './components/ServerCard';
import { McpServerForm } from './McpServerForm';
import type { MCPServer } from '@/common/types/mcp';

export const McpDashboard: React.FC = () => {
  const [servers, setServers] = useAtom(mcpServersAtom);
  const [loading, setLoading] = useAtom(mcpLoadingAtom);
  const [error, setError] = useAtom(mcpErrorAtom);
  const [searchQuery, setSearchQuery] = useAtom(mcpSearchQueryAtom);
  const [filteredServers] = useAtom(filteredServersAtom);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingServer, setEditingServer] = useState<MCPServer | null>(null);

  // Load servers on mount
  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await mcpService.getServers();
      setServers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load servers');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (name: string, activate: boolean) => {
    try {
      await mcpService.setServerActive(name, activate);
      await loadServers();
    } catch (err) {
      alert(`Failed to ${activate ? 'activate' : 'deactivate'} server: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleEdit = (server: MCPServer) => {
    setEditingServer(server);
    setShowAddModal(true);
  };

  const handleDelete = async (name: string) => {
    try {
      await mcpService.deleteServer(name);
      await loadServers();
    } catch (err) {
      alert(`Failed to delete server: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleRefreshStatus = async (name: string) => {
    try {
      await mcpService.getServerStatus(name);
      await loadServers();
    } catch (err) {
      console.error('Failed to refresh status:', err);
    }
  };

  const handleCleanupAll = async () => {
    if (!confirm('Are you sure you want to cleanup all servers? This will deactivate all active servers.')) {
      return;
    }
    try {
      await mcpService.cleanupServers();
      await loadServers();
    } catch (err) {
      alert(`Failed to cleanup servers: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleFormClose = () => {
    setShowAddModal(false);
    setEditingServer(null);
  };

  const handleFormSuccess = () => {
    setShowAddModal(false);
    setEditingServer(null);
    loadServers();
  };

  return (
    <div className="h-full flex flex-col bg-[#F2F3F5] dark:bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <FiServer className="text-blue-600 dark:text-blue-400" size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">MCP Servers</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Manage Model Context Protocol servers and tools
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadServers}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh servers"
            >
              <FiRefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>

            <button
              onClick={handleCleanupAll}
              disabled={loading || servers.length === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Cleanup all servers"
            >
              <FiTrash size={16} />
              Cleanup All
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <FiPlus size={16} />
              Add Server
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search servers by name, type, or status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
            <p className="font-medium">Error loading servers</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {loading && servers.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <FiRefreshCw className="animate-spin mx-auto mb-3 text-gray-400" size={32} />
              <p className="text-gray-500 dark:text-gray-400">Loading servers...</p>
            </div>
          </div>
        ) : filteredServers.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center max-w-md">
              {searchQuery ? (
                <>
                  <FiSearch className="mx-auto mb-3 text-gray-400" size={48} />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    No servers found
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    No servers match your search query "{searchQuery}"
                  </p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                  >
                    Clear search
                  </button>
                </>
              ) : (
                <>
                  <FiServer className="mx-auto mb-3 text-gray-400" size={48} />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    No MCP servers yet
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Get started by adding your first MCP server to enable powerful tool integrations
                  </p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    <FiPlus size={16} />
                    Add Your First Server
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredServers.map((server) => (
              <ServerCard
                key={server.name}
                server={server}
                onToggleActive={handleToggleActive}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onRefreshStatus={handleRefreshStatus}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <McpServerForm
          server={editingServer}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
};