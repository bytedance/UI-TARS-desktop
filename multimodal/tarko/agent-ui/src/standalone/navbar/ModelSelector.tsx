import React, { useState, useEffect } from 'react';
import {
  Select,
  MenuItem,
  FormControl,
  Box,
  Typography,
  CircularProgress,
  ThemeProvider,
  Tooltip,
} from '@mui/material';
import { useSetAtom } from 'jotai';
import { updateSessionMetadataAction } from '@/common/state/actions/sessionActions';
import { apiService } from '@/common/services/apiService';
import { SessionItemMetadata } from '@tarko/interface';
import { AgentModel } from '@tarko/agent-interface';
import { useReplayMode } from '@/common/hooks/useReplayMode';
import { useAtomValue } from 'jotai';
import { isProcessingAtom } from '@/common/state/atoms/ui';
import { getTooltipProps } from '@/common/components/TooltipConfig';
import { createBasicMuiTheme, createModelSelectorMuiTheme } from '@/common/utils/muiTheme';

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

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
      <Typography
        variant="body2"
        sx={{
          fontWeight: isSelected ? 600 : 500,
          fontSize,
          color: isSelected
            ? isDarkMode
              ? '#a5b4fc'
              : '#6366f1'
            : isDarkMode
              ? '#f3f4f6'
              : '#374151',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={displayText}
      >
        {displayText}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          color: isDarkMode ? '#9ca3af' : '#6b7280',
          fontSize,
          flexShrink: 0,
        }}
      >
        •
      </Typography>
      <Typography
        variant="body2"
        sx={{
          fontWeight: isSelected ? 600 : 500,
          fontSize,
          color: isSelected
            ? isDarkMode
              ? '#a5b4fc'
              : '#6366f1'
            : isDarkMode
              ? '#d1d5db'
              : '#6b7280',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={model.provider}
      >
        {model.provider}
      </Typography>
      {showLoading && (
        <CircularProgress size={12} thickness={4} sx={{ color: '#6366f1', marginLeft: 'auto' }} />
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
  if (!sessionMetadata?.modelConfig) {
    return null;
  }

  const tooltipProps = getTooltipProps('bottom');
  const muiTheme = React.useMemo(() => createBasicMuiTheme(isDarkMode), [isDarkMode]);

  const content = (
    <ThemeProvider theme={muiTheme}>
      <div
        className={`${className} transition-transform hover:scale-105 ${isDisabled ? '' : 'cursor-pointer'}`}
      >
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            px: 1.25,
            py: 0.375,
            height: '28px',
            minHeight: '28px',
            width: 'auto',
            minWidth: 'auto',
            maxWidth: '300px',
            background: isDisabled
              ? isDarkMode
                ? 'rgba(55, 65, 81, 0.15)'
                : 'rgba(248, 250, 252, 0.4)'
              : isDarkMode
                ? 'rgba(55, 65, 81, 0.3)'
                : 'rgba(248, 250, 252, 0.8)',
            backdropFilter: 'blur(8px)',
            border: isDisabled
              ? isDarkMode
                ? '1px solid rgba(75, 85, 99, 0.15)'
                : '1px solid rgba(203, 213, 225, 0.3)'
              : isDarkMode
                ? '1px solid rgba(75, 85, 99, 0.3)'
                : '1px solid rgba(203, 213, 225, 0.6)',
            borderRadius: '8px',
            opacity: isDisabled ? 0.6 : 1,
            cursor: isDisabled ? 'not-allowed' : 'default',
            '&:hover': isDisabled
              ? {}
              : {
                  background: isDarkMode ? 'rgba(55, 65, 81, 0.8)' : 'rgba(241, 245, 249, 0.9)',
                  boxShadow: isDarkMode
                    ? '0 2px 4px -1px rgba(0, 0, 0, 0.2)'
                    : '0 2px 4px -1px rgba(0, 0, 0, 0.05)',
                },
          }}
        >
          <ModelDisplayContent
            model={sessionMetadata.modelConfig}
            isDarkMode={isDarkMode}
            fontSize="12px"
          />
        </Box>
      </div>
    </ThemeProvider>
  );

  if (isDisabled && disabledReason) {
    return (
      <Tooltip title={disabledReason} {...tooltipProps}>
        <span>{content}</span>
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

  const muiTheme = React.useMemo(() => createModelSelectorMuiTheme(isDarkMode), [isDarkMode]);

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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
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
    <ThemeProvider theme={muiTheme}>
      <div className={`${className} transition-transform hover:scale-105 active:scale-95`}>
        <FormControl size="small">
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
            size="small"
            MenuProps={{
              PaperProps: {
                style: {
                  maxHeight: 360,
                  marginTop: 8,
                },
                sx: {
                  zIndex: 10000,
                  '@keyframes menuSlideIn': {
                    '0%': {
                      opacity: 0,
                      transform: 'translateY(-8px) scale(0.95)',
                    },
                    '100%': {
                      opacity: 1,
                      transform: 'translateY(0) scale(1)',
                    },
                  },
                },
              },
              anchorOrigin: {
                vertical: 'bottom',
                horizontal: 'left',
              },
              transformOrigin: {
                vertical: 'top',
                horizontal: 'left',
              },
            }}
            sx={{
              width: 'auto',
              minWidth: 'auto',
              maxWidth: '300px',
            }}
          >
            {models.map((model) => {
              const modelKey = getModelKey(model);
              const isSelected = isSameModel(currentModel, model);

              return (
                <MenuItem key={modelKey} value={modelKey}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <ModelDisplayContent
                        model={model}
                        isDarkMode={isDarkMode}
                        fontSize="14px"
                        isSelected={isSelected}
                      />
                    </Box>
                  </Box>
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>
      </div>
    </ThemeProvider>
  );
};
