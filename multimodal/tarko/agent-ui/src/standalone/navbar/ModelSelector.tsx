import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getModelDisplayName } from '@/common/utils/modelUtils';
import {
  Select,
  MenuItem,
  FormControl,
  Box,
  Typography,
  CircularProgress,
  createTheme,
  ThemeProvider,
} from '@mui/material';
import { useSetAtom } from 'jotai';
import { updateSessionMetadataAction } from '@/common/state/actions/sessionActions';
import { apiService } from '@/common/services/apiService';
import { SessionItemMetadata } from '@tarko/interface';
import { AgentModel } from '@tarko/agent-interface';
import { useReplayMode } from '@/common/hooks/useReplayMode';

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

// Shared static model display component
const StaticModelDisplay: React.FC<{
  sessionMetadata: SessionItemMetadata;
  isDarkMode: boolean;
  className?: string;
  muiTheme: any;
}> = ({ sessionMetadata, isDarkMode, className, muiTheme }) => {
  if (!sessionMetadata?.modelConfig) {
    return null;
  }

  return (
    <ThemeProvider theme={muiTheme}>
      <motion.div whileHover={{ scale: 1.02 }} className={className}>
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
            background: isDarkMode ? 'rgba(55, 65, 81, 0.3)' : 'rgba(248, 250, 252, 0.8)',
            backdropFilter: 'blur(8px)',
            border: isDarkMode
              ? '1px solid rgba(75, 85, 99, 0.3)'
              : '1px solid rgba(203, 213, 225, 0.6)',
            borderRadius: '8px',
            '&:hover': {
              background: isDarkMode ? 'rgba(55, 65, 81, 0.8)' : 'rgba(241, 245, 249, 0.9)',
              boxShadow: isDarkMode
                ? '0 2px 4px -1px rgba(0, 0, 0, 0.2)'
                : '0 2px 4px -1px rgba(0, 0, 0, 0.05)',
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
            {sessionMetadata.modelConfig.id && (
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 500,
                  fontSize: '12px',
                  color: isDarkMode ? '#f3f4f6' : '#374151',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {getModelDisplayName(sessionMetadata.modelConfig)}
              </Typography>
            )}
            {sessionMetadata.modelConfig.provider && sessionMetadata.modelConfig.id && (
              <Typography
                variant="body2"
                sx={{
                  color: isDarkMode ? '#9ca3af' : '#6b7280',
                  fontSize: '12px',
                  flexShrink: 0,
                }}
              >
                •
              </Typography>
            )}
            {sessionMetadata.modelConfig.provider && (
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 500,
                  fontSize: '12px',
                  color: isDarkMode ? '#d1d5db' : '#6b7280',
                  whiteSpace: 'nowrap',
                }}
              >
                {sessionMetadata.modelConfig.provider}
              </Typography>
            )}
          </Box>
        </Box>
      </motion.div>
    </ThemeProvider>
  );
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

  // Get current model from session metadata - simplified since server always provides modelConfig
  const currentModel = React.useMemo(() => {
    // Wait for models to be loaded
    if (models.length === 0) return null;

    // Server always provides modelConfig, so we can directly use it
    if (sessionMetadata?.modelConfig) {
      const foundModel = models.find(
        (m) =>
          m.provider === sessionMetadata.modelConfig?.provider &&
          m.id === sessionMetadata.modelConfig?.id,
      );
      return foundModel || models[0]; // fallback to first model if saved model not found
    }

    // If sessionMetadata is still loading, don't show any model yet
    return null;
  }, [models, sessionMetadata]);



  const muiTheme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode: isDarkMode ? 'dark' : 'light',
          primary: {
            main: '#6366f1',
          },
          background: {
            paper: isDarkMode ? 'rgba(31, 41, 55, 0.98)' : 'rgba(255, 255, 255, 0.98)',
            default: isDarkMode ? '#1f2937' : '#f9fafb',
          },
          text: {
            primary: isDarkMode ? '#f9fafb' : '#374151',
            secondary: isDarkMode ? '#d1d5db' : '#6b7280',
          },
        },
        components: {
          MuiSelect: {
            styleOverrides: {
              root: {
                borderRadius: '8px',
                height: '28px',
                minHeight: '28px',
                fontSize: '12px',
                fontWeight: 500,
                background: isDarkMode ? 'rgba(55, 65, 81, 0.3)' : 'rgba(248, 250, 252, 0.8)',
                backdropFilter: 'blur(8px)',
                border: isDarkMode
                  ? '1px solid rgba(75, 85, 99, 0.3)'
                  : '1px solid rgba(203, 213, 225, 0.6)',
                '& .MuiOutlinedInput-notchedOutline': {
                  border: 'none',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  border: 'none',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  border: 'none',
                },
                '&:hover': {
                  background: isDarkMode ? 'rgba(55, 65, 81, 0.8)' : 'rgba(241, 245, 249, 0.9)',
                  boxShadow: isDarkMode
                    ? '0 2px 4px -1px rgba(0, 0, 0, 0.2)'
                    : '0 2px 4px -1px rgba(0, 0, 0, 0.05)',
                },
                '& .MuiSelect-icon': {
                  display: 'none',
                },
              },
              select: {
                padding: '4px 10px !important',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                height: '24px',
                minHeight: '24px',
              },
            },
          },
          MuiMenuItem: {
            styleOverrides: {
              root: {
                fontSize: '13px',
                padding: '8px 16px',
                borderRadius: '8px',
                margin: '3px 8px',
                minHeight: '40px',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  backgroundColor: isDarkMode
                    ? 'rgba(99, 102, 241, 0.15)'
                    : 'rgba(99, 102, 241, 0.08)',
                  transform: 'translateX(2px)',
                },
                '&.Mui-selected': {
                  backgroundColor: isDarkMode
                    ? 'rgba(99, 102, 241, 0.25)'
                    : 'rgba(99, 102, 241, 0.12)',
                  color: isDarkMode ? '#a5b4fc' : '#6366f1',
                  '&:hover': {
                    backgroundColor: isDarkMode
                      ? 'rgba(99, 102, 241, 0.3)'
                      : 'rgba(99, 102, 241, 0.18)',
                    transform: 'translateX(2px)',
                  },
                },
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                borderRadius: '16px',
                maxWidth: '400px',
                boxShadow: isDarkMode
                  ? '0 20px 40px -10px rgba(0, 0, 0, 0.5), 0 8px 16px -4px rgba(0, 0, 0, 0.3)'
                  : '0 20px 40px -10px rgba(0, 0, 0, 0.15), 0 8px 16px -4px rgba(0, 0, 0, 0.08)',
                backdropFilter: 'blur(20px)',
                border: isDarkMode
                  ? '1px solid rgba(75, 85, 99, 0.4)'
                  : '1px solid rgba(229, 231, 235, 0.6)',
                background: isDarkMode ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                animation: 'menuSlideIn 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                transformOrigin: 'top center',
              },
            },
          },
        },
      }),
    [isDarkMode],
  );

  const handleModelChange = async (selectedModel: AgentModel) => {
    if (!activeSessionId || isLoading || !selectedModel) return;

    setIsLoading(true);
    try {
      const response = await apiService.updateSessionModel(activeSessionId, selectedModel);
      if (response.success && response.sessionInfo?.metadata) {
        // Update session metadata using utility action
        updateSessionMetadata({
          sessionId: activeSessionId,
          metadata: response.sessionInfo.metadata
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
      if (models.length > 0) return; // Only load once

      try {
        const response = await apiService.getAvailableModels();
        setModels(response.models);
      } catch (error) {
        console.error('Failed to load models:', error);
      }
    };

    loadModels();
  }, [models.length]);

  // In replay mode or share mode (no activeSessionId), show static display if we have model config
  if (!activeSessionId || isReplayMode) {
    return (
      <StaticModelDisplay
        sessionMetadata={sessionMetadata}
        isDarkMode={isDarkMode}
        className={className}
        muiTheme={muiTheme}
      />
    );
  }

  if (models.length === 0) {
    return null;
  }

  // Show selector only if there are multiple models available
  if (models.length <= 1) {
    return (
      <StaticModelDisplay
        sessionMetadata={sessionMetadata}
        isDarkMode={isDarkMode}
        className={className}
        muiTheme={muiTheme}
      />
    );
  }

  const renderValue = (selected: AgentModel | null) => {
    if (!selected) return 'Select Model';

    const displayText = getModelDisplayText(selected);
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 500,
              fontSize: '12px',
              color: isDarkMode ? '#f3f4f6' : '#374151',
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
              fontSize: '12px',
              flexShrink: 0,
            }}
          >
            •
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 500,
              fontSize: '12px',
              color: isDarkMode ? '#d1d5db' : '#6b7280',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={selected.provider}
          >
            {selected.provider}
          </Typography>
        </Box>
        {isLoading && (
          <CircularProgress size={12} thickness={4} sx={{ color: '#6366f1', marginLeft: 'auto' }} />
        )}
      </Box>
    );
  };

  return (
    <ThemeProvider theme={muiTheme}>
      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className={className}>
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
              const displayText = getModelDisplayText(model);

              return (
                <MenuItem key={modelKey} value={modelKey}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: isSelected ? 600 : 500,
                          fontSize: '14px',
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
                      >
                        {displayText}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: isDarkMode ? '#9ca3af' : '#6b7280',
                          fontSize: '14px',
                          flexShrink: 0,
                        }}
                      >
                        •
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: isSelected ? 600 : 500,
                          fontSize: '13px',
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
                      >
                        {model.provider}
                      </Typography>
                    </Box>
                  </Box>
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>
      </motion.div>
    </ThemeProvider>
  );
};
