import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAtomValue } from 'jotai';
import {
  FiArrowLeft,
  FiPlay,
  FiPause,
  FiEdit2,
  FiTrash2,
  FiRefreshCw,
  FiSearch,
  FiChevronDown,
  FiChevronUp,
} from 'react-icons/fi';
import { mcpServersAtom } from '@/common/state/atoms/mcp';
import { mcpService } from '@/common/services/mcpService';
import { ServerStatusBadge } from './components/ServerStatusBadge';
import { ToolCallForm } from './components/ToolCallForm';
import { ToolResultRenderer } from './components/ToolResultRenderer';
import type { MCPTool, MCPToolCallResult, MCPStreamEvent } from '@/common/types/mcp';

export const McpServerDetail: React.FC = () => {
  const { serverName } = useParams<{ serverName: string }>();
  const navigate = useNavigate();
  const servers = useAtomValue(mcpServersAtom);
  
  const server = servers.find((s) => s.name === serverName);
  
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTool, setExpandedTool] = useState<string | null>(null);
  const [toolResult, setToolResult] = useState<MCPToolCallResult | null>(null);
  const [streamingEvents, setStreamingEvents] = useState<MCPStreamEvent[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    if (server && server.status === 'active') {
      loadTools();
    }
  }, [server]);

  const loadTools = async () => {
    if (!serverName) return;
    
    setLoading(true);
    try {
      const data = await mcpService.getServerTools(serverName);
      setTools(data);
    } catch (err) {
      console.error('Failed to load tools:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async () => {
    if (!serverName || !server) return;
    
    try {
      await mcpService.setServerActive(serverName, server.status !== 'active');
      // Reload page to refresh server status
      window.location.reload();
    } catch (err) {
      alert(`Failed to ${server.status === 'active' ? 'deactivate' : 'activate'} server: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleDelete = async () => {
    if (!serverName || !confirm(`Are you sure you want to delete "${serverName}"?`)) {
      return;
    }
    
    try {
      await mcpService.deleteServer(serverName);
      navigate('/mcp');
    } catch (err) {
      alert(`Failed to delete server: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleToolCall = async (toolId: string, args: any, stream: boolean) => {
    if (!serverName) return;
    
    setToolResult(null);
    setStreamingEvents([]);
    
    if (stream) {
      setIsStreaming(true);
      try {
        await mcpService.callToolStreaming(serverName, toolId, args, (event) => {
          setStreamingEvents((prev) => [...prev, event]);
        });
      } catch (err) {
        console.error('Streaming error:', err);
      } finally {
        setIsStreaming(false);
      }
    } else {
      try {
        const result = await mcpService.callTool(serverName, toolId, args);
        setToolResult(result);
      } catch (err) {
        console.error('Tool call error:', err);
      }
    }
  };

  const filteredTools = tools.filter(
    (tool) =>
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!server) {
    return (
      <div className="h-full flex items-center justify-center bg-[#F2F3F5] dark:bg-gray-900">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Server not found</p>
          <button
            onClick={() => navigate('/mcp')}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Back to servers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#F2F3F5] dark:bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate('/mcp')}
            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Back to servers"
          >
            <FiArrowLeft size={20} />
          </button>
          
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{server.name}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{server.type} server</p>
          </div>

          <ServerStatusBadge status={server.status} />

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleActive}
              disabled={server.status === 'activating'}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                server.status === 'active'
                  ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50'
                  : 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {server.status === 'active' ? (
                <>
                  <FiPause size={16} />
                  Deactivate
                </>
              ) : (
                <>
                  <FiPlay size={16} />
                  Activate
                </>
              )}
            </button>

            <button
              onClick={handleDelete}
              className="p-2 rounded text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
              title="Delete server"
            >
              <FiTrash2 size={18} />
            </button>
          </div>
        </div>

        {/* Server Info */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Type:</span>
              <span className="ml-2 text-gray-900 dark:text-gray-100 capitalize">{server.type}</span>
            </div>
            {server.command && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Command:</span>
                <code className="ml-2 text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                  {server.command} {server.args?.slice(0, 2).join(' ')}
                </code>
              </div>
            )}
            {server.url && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">URL:</span>
                <code className="ml-2 text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                  {server.url}
                </code>
              </div>
            )}
            {server.lastError && (
              <div className="col-span-2">
                <span className="text-gray-500 dark:text-gray-400">Last Error:</span>
                <p className="mt-1 text-red-600 dark:text-red-400 text-xs">{server.lastError}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tools Section */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {server.status !== 'active' ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Server must be active to view and call tools
              </p>
              <button
                onClick={handleToggleActive}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              >
                <FiPlay size={16} />
                Activate Server
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search tools..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <FiRefreshCw className="animate-spin mx-auto mb-3 text-gray-400" size={32} />
                  <p className="text-gray-500 dark:text-gray-400">Loading tools...</p>
                </div>
              </div>
            ) : filteredTools.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <p className="text-gray-500 dark:text-gray-400">
                    {searchQuery ? 'No tools match your search' : 'No tools available'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTools.map((tool) => (
                  <div
                    key={tool.id}
                    className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                  >
                    {/* Tool Header */}
                    <button
                      onClick={() => setExpandedTool(expandedTool === tool.id ? null : tool.id)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex-1 text-left">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">{tool.name}</h3>
                        {tool.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            {tool.description}
                          </p>
                        )}
                      </div>
                      {expandedTool === tool.id ? (
                        <FiChevronUp className="text-gray-400" size={20} />
                      ) : (
                        <FiChevronDown className="text-gray-400" size={20} />
                      )}
                    </button>

                    {/* Tool Form (Expanded) */}
                    {expandedTool === tool.id && (
                      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                        <ToolCallForm
                          tool={tool}
                          onCall={(args, stream) => handleToolCall(tool.id, args, stream)}
                          isLoading={isStreaming}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Results Section */}
            {(toolResult || streamingEvents.length > 0) && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Tool Call Result
                </h3>
                <ToolResultRenderer
                  result={toolResult}
                  streamingEvents={streamingEvents}
                  isStreaming={isStreaming}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};