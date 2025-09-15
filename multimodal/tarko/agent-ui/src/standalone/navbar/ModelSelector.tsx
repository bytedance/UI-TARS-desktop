import React, { useState, useEffect, useCallback } from 'react';
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
import { apiService } from '@/common/services/apiService';
import { useSetAtom } from 'jotai';
import { sessionMetadataAtom } from '@/common/state/atoms/ui';

interface ModelConfig {
  provider: string;
  models: Array<{
    id: string;
    displayName?: string;
  }>;
}

interface AvailableModelsResponse {
  models: ModelConfig[];
}

interface NavbarModelSelectorProps {
  className?: string;
  activeSessionId?: string;
  sessionMetadata?: {
    modelConfig?: { provider: string; modelId: string; [key: string]: any };
    [key: string]: any;
  };
  isDarkMode?: boolean;
}

export const NavbarModelSelector: React.FC<NavbarModelSelectorProps> = ({
  className = '',
  activeSessionId,
  sessionMetadata,
  isDarkMode = false,
}) => {
  const [availableModels, setAvailableModels] = useState<AvailableModelsResponse | null>(null);
  const [currentModel, setCurrentModel] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const setSessionMetadata = useSetAtom(sessionMetadataAtom);

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

  const loadModels = useCallback(async () => {
    try {
      const models = await apiService.getAvailableModels();
      setAvailableModels(models);
    } catch (error) {
      console.error('Failed to load available models:', error);
    } finally {
      setIsInitialLoading(false);
    }
  }, []);

  const handleModelChange = useCallback(
    async (selectedValue: string) => {
      console.log('🎛️ [NavbarModelSelector] Model change initiated:', {
        selectedValue,
        sessionId: activeSessionId,
      });

      if (!activeSessionId || isLoading || !selectedValue) {
        console.warn('⚠️ [NavbarModelSelector] Model change blocked:', {
          hasSessionId: !!activeSessionId,
          isLoading,
          hasSelectedValue: !!selectedValue,
        });
        return;
      }

      const [provider, modelId] = selectedValue.split(':');
      console.log('🔍 [NavbarModelSelector] Parsed model selection:', {
        provider,
        modelId,
        selectedValue,
      });

      if (!provider || !modelId) {
        console.error('❌ [NavbarModelSelector] Invalid model format:', selectedValue);
        return;
      }

      console.log('⏳ [NavbarModelSelector] Starting model update...');
      setIsLoading(true);

      try {
        console.log('📞 [NavbarModelSelector] Calling update handler...');
        const response = await apiService.updateSessionModel(activeSessionId, provider, modelId);

        console.log('📋 [NavbarModelSelector] Update response:', response);

        if (response.success) {
          console.log('✅ [NavbarModelSelector] Model updated successfully, updating UI state');
          setCurrentModel(selectedValue);
          
          // Update sessionMetadata immediately with the new model config
          if (response.sessionInfo?.metadata) {
            setSessionMetadata(response.sessionInfo.metadata);
            console.log('✅ [NavbarModelSelector] Updated sessionMetadata:', response.sessionInfo.metadata);
          }
        } else {
          console.error('❌ [NavbarModelSelector] Update handler returned success=false');
        }
      } catch (error) {
        console.error('💥 [NavbarModelSelector] Failed to update session model:', error);
      } finally {
        console.log('🏁 [NavbarModelSelector] Model change completed');
        setIsLoading(false);
      }
    },
    [activeSessionId, isLoading],
  );

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  // Update current model when session metadata changes
  useEffect(() => {
    if (sessionMetadata?.modelConfig && availableModels) {
      const { provider, modelId } = sessionMetadata.modelConfig;
      const modelKey = `${provider}:${modelId}`;

      console.log('🔄 [ModelSelector] Updating current model from session metadata:', {
        provider,
        modelId,
        modelKey,
        sessionMetadata: sessionMetadata.modelConfig,
      });

      // Check if the session's model is still available
      const isModelAvailable = availableModels.models.some(
        (config) => config.provider === provider && config.models.some(model => model.id === modelId),
      );

      if (isModelAvailable) {
        console.log(
          '✅ [ModelSelector] Session model is available, setting current model:',
          modelKey,
        );
        setCurrentModel(modelKey);
      } else {
        console.warn('⚠️ [ModelSelector] Session model not available:', { provider, modelId });
        if (availableModels.models.length > 0) {
          // Fall back to first available model if session model is no longer available
          const firstModel = availableModels.models[0];
          if (firstModel.models.length > 0) {
            const fallbackKey = `${firstModel.provider}:${firstModel.models[0].id}`;
            console.log('🔄 [ModelSelector] Falling back to first available model:', fallbackKey);
            setCurrentModel(fallbackKey);
          }
        }
      }
    } else if (
      availableModels &&
      availableModels.models.length > 0 &&
      !sessionMetadata?.modelConfig
    ) {
      // No session model config, use first available model
      const firstModel = availableModels.models[0];
      if (firstModel.models.length > 0) {
        const fallbackKey = `${firstModel.provider}:${firstModel.models[0].id}`;
        console.log(
          '🆕 [ModelSelector] No session model config, using first available:',
          fallbackKey,
        );
        setCurrentModel(fallbackKey);
      }
    }
  }, [sessionMetadata, availableModels]);

  if (!activeSessionId || isInitialLoading) {
    return null;
  }

  // Check if there are multiple providers (calculate on frontend)
  const hasMultipleProviders = availableModels ? availableModels.models.length > 1 : false;

  if (!hasMultipleProviders || !availableModels || availableModels.models.length === 0) {
    if (!sessionMetadata?.modelConfig) {
      return null;
    }

    return (
      <ThemeProvider theme={muiTheme}>
        <motion.div whileHover={{ scale: 1.02 }} className={className}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                px: 1.25,
                py: 0.375,
                height: '28px',
                minHeight: '28px',
                background: isDarkMode ? 'rgba(55, 65, 81, 0.3)' : 'rgba(248, 250, 252, 0.8)',
                backdropFilter: 'blur(8px)',
                border: isDarkMode
                  ? '1px solid rgba(75, 85, 99, 0.3)'
                  : '1px solid rgba(203, 213, 225, 0.6)',
                borderRadius: '8px',
                // maxWidth: '220px',
                '&:hover': {
                  background: isDarkMode ? 'rgba(55, 65, 81, 0.8)' : 'rgba(241, 245, 249, 0.9)',
                  boxShadow: isDarkMode
                    ? '0 2px 4px -1px rgba(0, 0, 0, 0.2)'
                    : '0 2px 4px -1px rgba(0, 0, 0, 0.05)',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                {sessionMetadata?.modelConfig?.modelId && (
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
                {sessionMetadata?.modelConfig?.provider &&
                  sessionMetadata?.modelConfig?.modelId && (
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
                {sessionMetadata?.modelConfig?.provider && (
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
  }

  const allModelOptions = availableModels.models.flatMap((config) =>
    config.models.map((model) => ({
      value: `${config.provider}:${model.id}`,
      provider: config.provider,
      modelId: model.id,
      displayName: model.displayName || model.id,
      label: `${model.displayName || model.id} (${config.provider})`,
    })),
  );

  const renderValue = (selected: string) => {
    const option = allModelOptions.find((opt) => opt.value === selected);
    if (!option) return 'Select Model';

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
            title={option.displayName}
          >
            {option.displayName}
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
            title={option.provider}
          >
            {option.provider}
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
              value={currentModel}
              onChange={(event) => handleModelChange(event.target.value)}
              disabled={isLoading}
              displayEmpty
              renderValue={renderValue}
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
                minWidth: 200,
                maxWidth: 360,
              }}
            >
              {allModelOptions.map((option, idx) => {
                return (
                  <MenuItem key={`model-${idx}`} value={option.value}>
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
                            fontWeight: currentModel === option.value ? 600 : 500,
                            fontSize: '14px',
                            color:
                              currentModel === option.value
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
                          {option.displayName}
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
                            fontWeight: currentModel === option.value ? 600 : 500,
                            fontSize: '13px',
                            color:
                              currentModel === option.value
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
                          {option.provider}
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
