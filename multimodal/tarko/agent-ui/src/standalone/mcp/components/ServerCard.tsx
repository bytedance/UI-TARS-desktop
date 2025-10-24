import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlay, FiPause, FiEdit2, FiTrash2, FiRefreshCw, FiAlertCircle } from 'react-icons/fi';
import type { MCPServer } from '@/common/types/mcp';
import { ServerStatusBadge } from './ServerStatusBadge';

interface ServerCardProps {
  server: MCPServer;
  onToggleActive: (name: string, activate: boolean) => void;
  onEdit: (server: MCPServer) => void;
  onDelete: (name: string) => void;
  onRefreshStatus: (name: string) => void;
}

export const ServerCard: React.FC<ServerCardProps> = ({
  server,
  onToggleActive,
  onEdit,
  onDelete,
  onRefreshStatus,
}) => {
  const navigate = useNavigate();

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on action buttons
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    navigate(`/mcp/${server.name}`);
  };

  const getTypeIcon = () => {
    switch (server.type) {
      case 'command':
        return '⚡';
      case 'http':
        return '🌐';
      case 'sse':
        return '📡';
      case 'in-memory':
        return '💾';
      default:
        return '🔧';
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-all cursor-pointer group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-2xl flex-shrink-0">{getTypeIcon()}</span>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {server.name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{server.type}</p>
          </div>
        </div>
        <ServerStatusBadge status={server.status} />
      </div>

      {/* Connection Info */}
      <div className="mb-3 text-sm text-gray-600 dark:text-gray-400">
        {server.type === 'command' && server.command && (
          <div className="flex items-start gap-1">
            <span className="text-gray-500 dark:text-gray-500 flex-shrink-0">$</span>
            <code className="text-xs bg-gray-100 dark:bg-gray-900 px-1.5 py-0.5 rounded truncate block">
              {server.command} {server.args?.slice(0, 2).join(' ')}
              {server.args && server.args.length > 2 ? '...' : ''}
            </code>
          </div>
        )}
        {(server.type === 'http' || server.type === 'sse') && server.url && (
          <div className="flex items-center gap-1">
            <span className="text-gray-500 dark:text-gray-500">🔗</span>
            <code className="text-xs bg-gray-100 dark:bg-gray-900 px-1.5 py-0.5 rounded truncate block">
              {server.url}
            </code>
          </div>
        )}
      </div>

      {/* Error Message */}
      {server.status === 'error' && server.lastError && (
        <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-300 flex items-start gap-1.5">
          <FiAlertCircle className="flex-shrink-0 mt-0.5" size={14} />
          <span className="flex-1">{server.lastError}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleActive(server.name, server.status !== 'active');
          }}
          disabled={server.status === 'activating'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            server.status === 'active'
              ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50'
              : 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          title={server.status === 'active' ? 'Deactivate' : 'Activate'}
        >
          {server.status === 'active' ? (
            <>
              <FiPause size={12} />
              Stop
            </>
          ) : (
            <>
              <FiPlay size={12} />
              Start
            </>
          )}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onRefreshStatus(server.name);
          }}
          className="p-1.5 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Refresh status"
        >
          <FiRefreshCw size={14} />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(server);
          }}
          className="p-1.5 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Edit server"
        >
          <FiEdit2 size={14} />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Are you sure you want to delete "${server.name}"?`)) {
              onDelete(server.name);
            }
          }}
          className="p-1.5 rounded text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors ml-auto"
          title="Delete server"
        >
          <FiTrash2 size={14} />
        </button>
      </div>
    </div>
  );
};