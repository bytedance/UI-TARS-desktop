import React, { useState, useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { updateSessionMetadataAction } from '@/common/state/actions/sessionActions';
import { apiService } from '@/common/services/apiService';
import { SessionItemMetadata } from '@tarko/interface';
import { AgentModel } from '@tarko/agent-interface';
import { useReplayMode } from '@/common/hooks/useReplayMode';
import { useAtomValue } from 'jotai';
import { isProcessingAtom } from '@/common/state/atoms/ui';
import {
  Select,
  SelectMenuItem,
  FormControl,
  Box,
  CircularProgress,
  Tooltip,
  useNavbarStyles,
  useHoverHandlers,
} from '@tarko/ui';

interface NavbarModelSelectorProps {
  className?: string;
  activeSessionId?: string;
  sessionMetadata?: SessionItemMetadata;
  isDarkMode?: boolean;
}

const isSameModel = (a: AgentModel | null, b: AgentModel | null): boolean => {
  if (!a || !b) return false;
  return a.provider === b.provider && a.id === b.id;
};

const getModelKey = (model: AgentModel): string => `${model.provider}:${model.id}`;

const getModelDisplayText = (model: AgentModel) => model.displayName || model.id;

// Shared component for displaying model information
const ModelDisplayContent: React.FC<{
  model: AgentModel;
  isDarkMode: boolean;
  fontSize?: string;
  isSelected?: boolean;
  showLoading?: boolean;
}> = ({ model, isDarkMode, fontSize = '12px', isSelected = false, showLoading = false }) => {
  const displayText = getModelDisplayText(model);
  const { getTextStyles } = useNavbarStyles();
  const textStyles = getTextStyles();

  return (
    <Box style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
      <span
        style={{
          ...textStyles.modelName,
          fontSize,
          fontWeight: isSelected ? 600 : 500,
          color: isSelected ? (isDarkMode ? '#a5b4fc' : '#6366f1') : textStyles.modelName.color,
        }}
        title={displayText}
      >
        {displayText}
      </span>
      <span
        style={{
          color: isDarkMode ? '#9ca3af' : '#6b7280',
          fontSize,
          flexShrink: 0,
        }}
      >
        •
      </span>
      <span
        style={{
          ...textStyles.provider,
          fontSize,
          fontWeight: isSelected ? 600 : 500,
          color: isSelected ? (isDarkMode ? '#a5b4fc' : '#6366f1') : textStyles.provider.color,
        }}
        title={model.provider}
      >
        {model.provider}
      </span>
      {showLoading && (
        <CircularProgress
          size={12}
          thickness={4}
          style={{ color: '#6366f1', marginLeft: 'auto' }}
        />
      )}
    </Box>
  );
};

const StaticModelDisplay: React.FC<{
  sessionMetadata: SessionItemMetadata;
  isDarkMode: boolean;
  className?: string;
  isDisabled?: boolean;
  disabledReason?: string;
}> = ({ sessionMetadata, isDarkMode, className, isDisabled = false, disabledReason }) => {
  const { getModelSelectorStyles } = useNavbarStyles();
  const { applyHoverStyles, resetStyles } = useHoverHandlers();
  const [isHovered, setIsHovered] = React.useState(false);

  if (!sessionMetadata?.modelConfig) {
    return null;
  }

  const modelStyles = getModelSelectorStyles(isDisabled);

  const content = (
    <div
      className={`${className} transition-transform hover:scale-105 ${isDisabled ? '' : 'cursor-pointer'} hidden md:block`}
    >
      <Box
        style={{
          ...modelStyles.base,
          maxWidth: '300px',
          ...(isHovered && !isDisabled ? modelStyles.hover : {}),
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <ModelDisplayContent
          model={sessionMetadata.modelConfig}
          isDarkMode={isDarkMode}
          fontSize="12px"
        />
      </Box>
    </div>
  );

  if (isDisabled && disabledReason) {
    return (
      <Tooltip title={disabledReason} placement="bottom">
        <span className="hidden md:inline">{content}</span>
      </Tooltip>
    );
  }

  return content;
};

export const NavbarModelSelector: React.FC<NavbarModelSelectorProps> = ({
  className = '',
  activeSessionId,
  sessionMetadata,
  isDarkMode = false,
}) => {
  const [models, setModels] = useState<AgentModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const updateSessionMetadata = useSetAtom(updateSessionMetadataAction);
  const { isReplayMode } = useReplayMode();
  const isProcessing = useAtomValue(isProcessingAtom);

  const currentModel = React.useMemo(() => {
    if (models.length === 0) return null;

    if (sessionMetadata?.modelConfig) {
      const foundModel = models.find(
        (m) =>
          m.provider === sessionMetadata.modelConfig?.provider &&
          m.id === sessionMetadata.modelConfig?.id,
      );
      return foundModel || models[0];
    }

    return null;
  }, [models, sessionMetadata]);

  const handleModelChange = async (selectedModel: AgentModel) => {
    if (!activeSessionId || isLoading || !selectedModel) return;

    setIsLoading(true);
    try {
      const response = await apiService.updateSessionModel(activeSessionId, selectedModel);
      if (response.success && response.sessionInfo?.metadata) {
        updateSessionMetadata({
          sessionId: activeSessionId,
          metadata: response.sessionInfo.metadata,
        });
      }
    } catch (error) {
      console.error('Failed to update session model:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadModels = async () => {
      if (models.length > 0) return;

      try {
        const response = await apiService.getAvailableModels();
        setModels(response.models);
      } catch (error) {
        console.error('Failed to load models:', error);
      }
    };

    loadModels();
  }, [models.length]);

  if (!activeSessionId || isReplayMode || isProcessing) {
    return (
      <StaticModelDisplay
        sessionMetadata={sessionMetadata}
        isDarkMode={isDarkMode}
        className={className}
        isDisabled={isProcessing && models.length > 1}
        disabledReason={
          isProcessing && models.length > 1
            ? 'Model selection unavailable during agent execution. Please wait for agent execution to complete'
            : undefined
        }
      />
    );
  }

  if (models.length === 0) {
    return null;
  }

  if (models.length <= 1 || isProcessing) {
    return (
      <StaticModelDisplay
        sessionMetadata={sessionMetadata}
        isDarkMode={isDarkMode}
        className={className}
        isDisabled={isProcessing && models.length > 1}
        disabledReason={
          isProcessing && models.length > 1
            ? 'Model selection unavailable during agent execution. Please wait for agent execution to complete'
            : undefined
        }
      />
    );
  }

  const renderValue = (selected: AgentModel | null) => {
    if (!selected) return 'Select Model';

    return (
      <Box style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <ModelDisplayContent
          model={selected}
          isDarkMode={isDarkMode}
          fontSize="12px"
          showLoading={isLoading}
        />
      </Box>
    );
  };

  return (
    <div className={`${className} transition-transform hover:scale-105 active:scale-95`}>
      <FormControl>
        <Select
          value={currentModel ? getModelKey(currentModel) : ''}
          onChange={(event) => {
            const selectedKey = event.target.value as string;
            const selectedModel = models.find((model) => getModelKey(model) === selectedKey);
            if (selectedModel) {
              handleModelChange(selectedModel);
            }
          }}
          disabled={isLoading}
          displayEmpty
          renderValue={() => renderValue(currentModel)}
        >
          {models.map((model) => {
            const modelKey = getModelKey(model);
            const isSelected = isSameModel(currentModel, model);

            return (
              <SelectMenuItem key={modelKey} value={modelKey}>
                <Box style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                  <Box style={{ minWidth: 0, flex: 1 }}>
                    <ModelDisplayContent
                      model={model}
                      isDarkMode={isDarkMode}
                      fontSize="14px"
                      isSelected={isSelected}
                    />
                  </Box>
                </Box>
              </SelectMenuItem>
            );
          })}
        </Select>
      </FormControl>
    </div>
  );
};
