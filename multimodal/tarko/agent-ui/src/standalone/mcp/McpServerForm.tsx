import React, { useState, useEffect } from 'react';
import { FiX, FiPlus, FiTrash2 } from 'react-icons/fi';
import { mcpService } from '@/common/services/mcpService';
import type { MCPServer, MCPServerType } from '@/common/types/mcp';

interface McpServerFormProps {
  server?: MCPServer | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const McpServerForm: React.FC<McpServerFormProps> = ({ server, onClose, onSuccess }) => {
  const isEditing = !!server;
  
  const [formData, setFormData] = useState({
    name: server?.name || '',
    type: server?.type || ('command' as MCPServerType),
    command: server?.command || '',
    args: server?.args || [],
    url: server?.url || '',
    env: server?.env || {},
    allowFilters: server?.filters?.allow || [],
    blockFilters: server?.filters?.block || [],
  });

  const [newArg, setNewArg] = useState('');
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvValue, setNewEnvValue] = useState('');
  const [newAllowFilter, setNewAllowFilter] = useState('');
  const [newBlockFilter, setNewBlockFilter] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Server name is required';
    } else if (!/^[a-zA-Z0-9-_]+$/.test(formData.name)) {
      newErrors.name = 'Server name can only contain letters, numbers, hyphens, and underscores';
    }

    if (formData.type === 'command' && !formData.command.trim()) {
      newErrors.command = 'Command is required for command-based servers';
    }

    if ((formData.type === 'http' || formData.type === 'sse') && !formData.url.trim()) {
      newErrors.url = 'URL is required for HTTP/SSE servers';
    } else if (formData.url && !formData.url.match(/^https?:\/\/.+/)) {
      newErrors.url = 'URL must start with http:// or https://';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const serverData: Omit<MCPServer, 'createdAt' | 'updatedAt'> = {
        name: formData.name,
        type: formData.type,
        status: 'inactive',
        ...(formData.type === 'command' && {
          command: formData.command,
          args: formData.args.length > 0 ? formData.args : undefined,
        }),
        ...((formData.type === 'http' || formData.type === 'sse') && {
          url: formData.url,
        }),
        ...(Object.keys(formData.env).length > 0 && { env: formData.env }),
        ...((formData.allowFilters.length > 0 || formData.blockFilters.length > 0) && {
          filters: {
            ...(formData.allowFilters.length > 0 && { allow: formData.allowFilters }),
            ...(formData.blockFilters.length > 0 && { block: formData.blockFilters }),
          },
        }),
      };

      if (isEditing) {
        await mcpService.updateServer(server.name, serverData);
      } else {
        await mcpService.addServer(serverData);
      }

      onSuccess();
    } catch (err) {
      alert(`Failed to ${isEditing ? 'update' : 'add'} server: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const addArg = () => {
    if (newArg.trim()) {
      setFormData({ ...formData, args: [...formData.args, newArg.trim()] });
      setNewArg('');
    }
  };

  const removeArg = (index: number) => {
    setFormData({ ...formData, args: formData.args.filter((_, i) => i !== index) });
  };

  const addEnv = () => {
    if (newEnvKey.trim() && newEnvValue.trim()) {
      setFormData({
        ...formData,
        env: { ...formData.env, [newEnvKey.trim()]: newEnvValue.trim() },
      });
      setNewEnvKey('');
      setNewEnvValue('');
    }
  };

  const removeEnv = (key: string) => {
    const newEnv = { ...formData.env };
    delete newEnv[key];
    setFormData({ ...formData, env: newEnv });
  };

  const addAllowFilter = () => {
    if (newAllowFilter.trim()) {
      setFormData({
        ...formData,
        allowFilters: [...formData.allowFilters, newAllowFilter.trim()],
      });
      setNewAllowFilter('');
    }
  };

  const removeAllowFilter = (index: number) => {
    setFormData({
      ...formData,
      allowFilters: formData.allowFilters.filter((_, i) => i !== index),
    });
  };

  const addBlockFilter = () => {
    if (newBlockFilter.trim()) {
      setFormData({
        ...formData,
        blockFilters: [...formData.blockFilters, newBlockFilter.trim()],
      });
      setNewBlockFilter('');
    }
  };

  const removeBlockFilter = (index: number) => {
    setFormData({
      ...formData,
      blockFilters: formData.blockFilters.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {isEditing ? 'Edit Server' : 'Add New Server'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4">
          {/* Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Server Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={isEditing}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="e.g., tavily-search"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>}
          </div>

          {/* Type */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Server Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as MCPServerType })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="command">Command</option>
              <option value="http">HTTP</option>
              <option value="sse">SSE</option>
              <option value="in-memory">In-Memory</option>
            </select>
          </div>

          {/* Command (for command type) */}
          {formData.type === 'command' && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Command <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.command}
                  onChange={(e) => setFormData({ ...formData, command: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., npx"
                />
                {errors.command && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.command}</p>}
              </div>

              {/* Args */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Arguments
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newArg}
                    onChange={(e) => setNewArg(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addArg())}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add argument"
                  />
                  <button
                    type="button"
                    onClick={addArg}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <FiPlus size={16} />
                  </button>
                </div>
                <div className="space-y-1">
                  {formData.args.map((arg, index) => (
                    <div key={index} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 px-3 py-2 rounded">
                      <code className="flex-1 text-sm text-gray-900 dark:text-gray-100">{arg}</code>
                      <button
                        type="button"
                        onClick={() => removeArg(index)}
                        className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* URL (for http/sse type) */}
          {(formData.type === 'http' || formData.type === 'sse') && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                URL <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://api.example.com/mcp"
              />
              {errors.url && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.url}</p>}
            </div>
          )}

          {/* Environment Variables */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Environment Variables
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newEnvKey}
                onChange={(e) => setNewEnvKey(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Key"
              />
              <input
                type="text"
                value={newEnvValue}
                onChange={(e) => setNewEnvValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addEnv())}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Value"
              />
              <button
                type="button"
                onClick={addEnv}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FiPlus size={16} />
              </button>
            </div>
            <div className="space-y-1">
              {Object.entries(formData.env).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 px-3 py-2 rounded">
                  <code className="text-sm text-gray-900 dark:text-gray-100">
                    {key}={value}
                  </code>
                  <button
                    type="button"
                    onClick={() => removeEnv(key)}
                    className="ml-auto text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Tool Filters */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Allow Filters */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Allow Tools
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newAllowFilter}
                  onChange={(e) => setNewAllowFilter(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAllowFilter())}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Tool name"
                />
                <button
                  type="button"
                  onClick={addAllowFilter}
                  className="px-2 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <FiPlus size={14} />
                </button>
              </div>
              <div className="space-y-1">
                {formData.allowFilters.map((filter, index) => (
                  <div key={index} className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded text-sm">
                    <span className="flex-1 text-gray-900 dark:text-gray-100">{filter}</span>
                    <button
                      type="button"
                      onClick={() => removeAllowFilter(index)}
                      className="text-red-600 dark:text-red-400"
                    >
                      <FiTrash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Block Filters */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Block Tools
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newBlockFilter}
                  onChange={(e) => setNewBlockFilter(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addBlockFilter())}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Tool name"
                />
                <button
                  type="button"
                  onClick={addBlockFilter}
                  className="px-2 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <FiPlus size={14} />
                </button>
              </div>
              <div className="space-y-1">
                {formData.blockFilters.map((filter, index) => (
                  <div key={index} className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded text-sm">
                    <span className="flex-1 text-gray-900 dark:text-gray-100">{filter}</span>
                    <button
                      type="button"
                      onClick={() => removeBlockFilter(index)}
                      className="text-red-600 dark:text-red-400"
                    >
                      <FiTrash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Saving...' : isEditing ? 'Update Server' : 'Add Server'}
          </button>
        </div>
      </div>
    </div>
  );
};