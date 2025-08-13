import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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

interface ModelConfig {
  provider: string;
  models: string[];
}

interface AvailableModelsResponse {
  models: ModelConfig[];
  defaultModel: {
    provider: string;
    modelId: string;
  };
  hasMultipleProviders: boolean;
}

interface ModelInfo {
  model?: string;
  provider?: string;
}

interface NavbarModelSelectorProps {
  className?: string;
  activeSessionId?: string;
  modelInfo?: ModelInfo;
  isDarkMode?: boolean;
  onLoadModels?: () => Promise<AvailableModelsResponse>;
  onUpdateModel?: (sessionId: string, provider: string, modelId: string) => Promise<boolean>;
}

export const NavbarModelSelector: React.FC<NavbarModelSelectorProps> = ({
  className = '',
  activeSessionId,
  modelInfo = {},
  isDarkMode = false,
  onLoadModels,
  onUpdateModel,
}) => {
  const [availableModels, setAvailableModels] = useState<AvailableModelsResponse | null>(null);
  const [currentModel, setCurrentModel] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

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

  useEffect(() => {
    const loadModels = async () => {
      if (!onLoadModels) {
        setIsInitialLoading(false);
        return;
      }

      try {
        const models = await onLoadModels();
        setAvailableModels(models);

        if (models.defaultModel) {
          const modelKey = `${models.defaultModel.provider}:${models.defaultModel.modelId}`;
          setCurrentModel(modelKey);
        }
      } catch (error) {
        console.error('Failed to load available models:', error);
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadModels();
  }, [onLoadModels]);

  if (!activeSessionId || isInitialLoading) {
    return null;
  }

  if (!availableModels?.hasMultipleProviders || availableModels.models.length === 0) {
    if (!modelInfo.model && !modelInfo.provider) {
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
              minWidth: 0,
              maxWidth: '220px',
              '&:hover': {
                background: isDarkMode ? 'rgba(55, 65, 81, 0.8)' : 'rgba(241, 245, 249, 0.9)',
                boxShadow: isDarkMode
                  ? '0 2px 4px -1px rgba(0, 0, 0, 0.2)'
                  : '0 2px 4px -1px rgba(0, 0, 0, 0.05)',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
              {modelInfo.model && (
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
                  title={modelInfo.model}
                >
                  {modelInfo.model}
                </Typography>
              )}
              {modelInfo.provider && modelInfo.model && (
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
              {modelInfo.provider && (
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
                  title={modelInfo.provider}
                >
                  {modelInfo.provider}
                </Typography>
              )}
            </Box>
          </Box>
        </motion.div>
      </ThemeProvider>
    );
  }

  const handleModelChange = async (selectedValue: string) => {
    console.log('🎛️ [NavbarModelSelector] Model change initiated:', {
      selectedValue,
      sessionId: activeSessionId,
      isLoading,
      currentModel,
    });

    if (!activeSessionId || !onUpdateModel || isLoading || !selectedValue) {
      console.warn('⚠️ [NavbarModelSelector] Model change blocked:', {
        hasSessionId: !!activeSessionId,
        hasUpdateHandler: !!onUpdateModel,
        isLoading,
        hasSelectedValue: !!selectedValue,
      });
      return;
    }

    const [provider, modelId] = selectedValue.split(':');
    console.log('🔍 [NavbarModelSelector] Parsed model selection:', { provider, modelId });

    if (!provider || !modelId) {
      console.error('❌ [NavbarModelSelector] Invalid model format:', selectedValue);
      return;
    }

    console.log('⏳ [NavbarModelSelector] Starting model update...');
    setIsLoading(true);

    try {
      console.log('📞 [NavbarModelSelector] Calling update handler...');
      const success = await onUpdateModel(activeSessionId, provider, modelId);

      console.log('📋 [NavbarModelSelector] Update response:', { success });

      if (success) {
        console.log('✅ [NavbarModelSelector] Model updated successfully, updating UI state');
        setCurrentModel(selectedValue);
      } else {
        console.error('❌ [NavbarModelSelector] Update handler returned success=false');
        setCurrentModel(currentModel);
      }
    } catch (error) {
      console.error('💥 [NavbarModelSelector] Failed to update session model:', error);
      setCurrentModel(currentModel);
    } finally {
      console.log('🏁 [NavbarModelSelector] Model change completed');
      setIsLoading(false);
    }
  };

  const allModelOptions = availableModels.models.flatMap((config) =>
    config.models.map((modelId) => ({
      value: `${config.provider}:${modelId}`,
      provider: config.provider,
      modelId,
      label: `${modelId} (${config.provider})`,
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
            title={option.modelId}
          >
            {option.modelId}
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
                  zIndex: 9999,
                },
                sx: {
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
              disablePortal: false,
              TransitionProps: {
                timeout: 200,
              },
            }}
            sx={{
              maxWidth: 360,
            }}
          >
            {allModelOptions.map((option, idx) => {
              return (
                <MenuItem key={idx} value={option.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    <Box
                      sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0, flex: 1 }}
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
                        title={option.modelId}
                      >
                        {option.modelId}
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
                        title={option.provider}
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
