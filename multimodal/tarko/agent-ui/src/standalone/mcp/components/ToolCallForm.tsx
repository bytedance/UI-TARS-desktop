import React, { useState } from 'react';
import { FiPlay, FiZap } from 'react-icons/fi';
import type { MCPTool, JSONSchema } from '@/common/types/mcp';

interface ToolCallFormProps {
  tool: MCPTool;
  onCall: (args: any, stream: boolean) => void;
  isLoading: boolean;
}

export const ToolCallForm: React.FC<ToolCallFormProps> = ({ tool, onCall, isLoading }) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [useStreaming, setUseStreaming] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCall(formData, useStreaming);
  };

  const renderInput = (name: string, schema: JSONSchema, required: boolean) => {
    const value = formData[name] ?? schema.default ?? '';

    switch (schema.type) {
      case 'string':
        if (schema.enum) {
          return (
            <select
              value={value}
              onChange={(e) => setFormData({ ...formData, [name]: e.target.value })}
              required={required}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select...</option>
              {schema.enum.map((option) => (
                <option key={String(option)} value={String(option)}>
                  {String(option)}
                </option>
              ))}
            </select>
          );
        }
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => setFormData({ ...formData, [name]: e.target.value })}
            required={required}
            minLength={schema.minLength}
            maxLength={schema.maxLength}
            pattern={schema.pattern}
            placeholder={schema.description}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        );

      case 'number':
      case 'integer':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) =>
              setFormData({
                ...formData,
                [name]: schema.type === 'integer' ? parseInt(e.target.value) : parseFloat(e.target.value),
              })
            }
            required={required}
            min={schema.minimum}
            max={schema.maximum}
            step={schema.type === 'integer' ? 1 : 'any'}
            placeholder={schema.description}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        );

      case 'boolean':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => setFormData({ ...formData, [name]: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {schema.description || 'Enable'}
            </span>
          </label>
        );

      case 'object':
        return (
          <textarea
            value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                setFormData({ ...formData, [name]: parsed });
              } catch {
                setFormData({ ...formData, [name]: e.target.value });
              }
            }}
            required={required}
            placeholder={schema.description || 'JSON object'}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        );

      case 'array':
        return (
          <textarea
            value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                setFormData({ ...formData, [name]: parsed });
              } catch {
                setFormData({ ...formData, [name]: e.target.value });
              }
            }}
            required={required}
            placeholder={schema.description || 'JSON array'}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        );

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => setFormData({ ...formData, [name]: e.target.value })}
            required={required}
            placeholder={schema.description}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        );
    }
  };

  const schema = tool.parametersSchema;
  const properties = schema?.properties || {};
  const required = schema?.required || [];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {Object.keys(properties).length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">This tool requires no parameters</p>
      ) : (
        Object.entries(properties).map(([name, propSchema]) => (
          <div key={name}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {name}
              {required.includes(name) && <span className="text-red-500 ml-1">*</span>}
            </label>
            {propSchema.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{propSchema.description}</p>
            )}
            {renderInput(name, propSchema, required.includes(name))}
          </div>
        ))
      )}

      <div className="flex items-center gap-4 pt-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={useStreaming}
            onChange={(e) => setUseStreaming(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1">
            <FiZap size={14} />
            Use streaming
          </span>
        </label>

        <button
          type="submit"
          disabled={isLoading}
          className="ml-auto flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FiPlay size={16} />
          {isLoading ? 'Calling...' : 'Call Tool'}
        </button>
      </div>
    </form>
  );
};