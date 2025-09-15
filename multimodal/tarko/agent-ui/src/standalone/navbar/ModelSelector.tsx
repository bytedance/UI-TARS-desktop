import React, { useState, useEffect, useCallback } from 'react';
import { getModelDisplayName } from '@/common/utils/modelUtils';
import { apiService } from '@/common/services/apiService';
import { useSetAtom } from 'jotai';
import { sessionMetadataAtom } from '@/common/state/atoms/ui';
import { SessionItemMetadata } from '@tarko/interface';
import { AgentModel } from '@tarko/agent-interface';

interface NavbarModelSelectorProps {
  className?: string;
  activeSessionId?: string;
  sessionMetadata?: SessionItemMetadata;
  isDarkMode?: boolean;
}

// Helper functions for model operations
const isSameModel = (a: AgentModel | null, b: AgentModel | null): boolean => {
  if (!a || !b) return false;
  return a.provider === b.provider && a.id === b.id;
};

const getModelKey = (model: AgentModel): string => `${model.provider}:${model.id}`;

const getModelDisplayText = (model: AgentModel) => model.displayName || model.id;

export const NavbarModelSelector: React.FC<NavbarModelSelectorProps> = ({
  className = '',
  activeSessionId,
  sessionMetadata,
  isDarkMode = false,
}) => {
  const [availableModels, setAvailableModels] = useState<{ models: AgentModel[] } | null>(null);
  const [currentModel, setCurrentModel] = useState<AgentModel | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const setSessionMetadata = useSetAtom(sessionMetadataAtom);

  const loadModels = useCallback(async () => {
    try {
      const models = await apiService.getAvailableModels();
      setAvailableModels(models);
    } catch (error) {
      console.error('Failed to load available models:', error);
    }
  }, []);

  const handleModelChange = useCallback(
    async (selectedModel: AgentModel) => {
      if (!activeSessionId || isLoading || !selectedModel) {
        return;
      }

      setIsLoading(true);

      try {
        const response = await apiService.updateSessionModel(activeSessionId, selectedModel);

        if (response.success) {
          setCurrentModel(selectedModel);

          // Update sessionMetadata immediately with the new model config
          if (response.sessionInfo?.metadata) {
            setSessionMetadata(response.sessionInfo.metadata);
          }
        }
      } catch (error) {
        console.error('Failed to update session model:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [activeSessionId, isLoading, setSessionMetadata],
  );

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  // Update current model when session metadata changes
  useEffect(() => {
    if (!availableModels?.models.length) return;

    const sessionModel = sessionMetadata?.modelConfig
      ? availableModels.models.find(
          (model) => 
            model.provider === sessionMetadata.modelConfig?.provider && 
            model.id === sessionMetadata.modelConfig?.id
        )
      : null;

    setCurrentModel(sessionModel || availableModels.models[0]);
  }, [sessionMetadata, availableModels]);

  if (!activeSessionId || !availableModels) {
    return null;
  }

  // Show current model if only one available
  if (availableModels.models.length <= 1) {
    const model = sessionMetadata?.modelConfig;
    if (!model) return null;

    return (
      <div className={`${className} px-2 py-1 text-xs font-medium rounded border ${
        isDarkMode 
          ? 'bg-gray-700/30 border-gray-600/30 text-gray-200' 
          : 'bg-gray-50/80 border-gray-200/60 text-gray-700'
      }`}>
        <span className="truncate">{getModelDisplayName(model)}</span>
        <span className="mx-1 text-gray-400">•</span>
        <span className="text-gray-500">{model.provider}</span>
      </div>
    );
  }

  return (
    <div className={className}>
      <select
        value={currentModel ? getModelKey(currentModel) : ''}
        onChange={(e) => {
          const selectedModel = availableModels.models.find(
            (model) => getModelKey(model) === e.target.value,
          );
          if (selectedModel) {
            handleModelChange(selectedModel);
          }
        }}
        disabled={isLoading}
        className={`text-xs font-medium px-2 py-1 rounded border focus:outline-none focus:ring-1 ${
          isDarkMode
            ? 'bg-gray-700/30 border-gray-600/30 text-gray-200 focus:ring-indigo-400'
            : 'bg-gray-50/80 border-gray-200/60 text-gray-700 focus:ring-indigo-500'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {availableModels.models.map((model) => (
          <option key={getModelKey(model)} value={getModelKey(model)}>
            {getModelDisplayText(model)} • {model.provider}
          </option>
        ))}
      </select>
      {isLoading && (
        <div className="ml-2 inline-block w-3 h-3 border border-indigo-500 border-t-transparent rounded-full animate-spin" />
      )}
    </div>
  );
};
