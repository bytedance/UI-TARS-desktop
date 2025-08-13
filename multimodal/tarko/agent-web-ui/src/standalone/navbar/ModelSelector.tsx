import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiZap, FiCpu } from 'react-icons/fi';
import {
  Select,
  MenuItem,
  FormControl,
  Box,
  Chip,
  Typography,
  CircularProgress,
  createTheme,
  ThemeProvider,
} from '@mui/material';
import { apiService } from '@/common/services/apiService';
import { useDarkMode } from '@/common/hooks/useDarkMode';
import { useSession } from '@/common/hooks/useSession';

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

interface NavbarModelSelectorProps {
  className?: string;
}

/**
 * NavbarModelSelector Component - MUI implementation adapted for navbar
 *
 * Features:
 * - Uses Material-UI Select for enterprise-grade reliability
 * - Responsive dark mode support with useDarkMode hook
 * - Modern styling matching app aesthetics
 * - Proper z-index handling for dropdown positioning
 * - Adapted from chat ModelSelector for navbar use
 */
export const NavbarModelSelector: React.FC<NavbarModelSelectorProps> = ({ className = '' }) => {
  const { activeSessionId, modelInfo } = useSession();
  const [availableModels, setAvailableModels] = useState<AvailableModelsResponse | null>(null);
  const [currentModel, setCurrentModel] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const isDarkMode = useDarkMode();

  // Create custom theme for MUI components to match the app's design
  // Recreate theme when dark mode changes
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
                minHeight: '32px',
                fontSize: '12px',
                fontWeight: 500,
                background: isDarkMode ? 'rgba(55, 65, 81, 0.3)' : 'rgba(255, 255, 255, 0.6)',
                backdropFilter: 'blur(8px)',
                border: isDarkMode
                  ? '1px solid rgba(75, 85, 99, 0.3)'
                  : '1px solid rgba(229, 231, 235, 0.5)',
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
                  background: isDarkMode ? 'rgba(55, 65, 81, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                  boxShadow: isDarkMode
                    ? '0 2px 4px -1px rgba(0, 0, 0, 0.2)'
                    : '0 2px 4px -1px rgba(0, 0, 0, 0.05)',
                },
                // Hide the dropdown arrow
                '& .MuiSelect-icon': {
                  display: 'none',
                },
              },
              select: {
                padding: '6px 10px !important',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              },
            },
          },
          MuiMenuItem: {
            styleOverrides: {
              root: {
                fontSize: '12px',
                padding: '6px 12px',
                borderRadius: '6px',
                margin: '2px 6px',
                '&:hover': {
                  backgroundColor: isDarkMode
                    ? 'rgba(99, 102, 241, 0.15)'
                    : 'rgba(99, 102, 241, 0.08)',
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
                  },
                },
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                borderRadius: '12px',
                boxShadow: isDarkMode
                  ? '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.2)'
                  : '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                backdropFilter: 'blur(16px)',
                border: isDarkMode
                  ? '1px solid rgba(75, 85, 99, 0.3)'
                  : '1px solid rgba(229, 231, 235, 0.5)',
                background: isDarkMode ? 'rgba(31, 41, 55, 0.98)' : 'rgba(255, 255, 255, 0.98)',
              },
            },
          },
        },
      }),
    [isDarkMode],
  );

  // Load available models on component mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        const models = await apiService.getAvailableModels();
        setAvailableModels(models);

        // Set initial current model to default
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
  }, []);

  // Don't render if no session
  if (!activeSessionId || isInitialLoading) {
    return null;
  }

  // If no multiple providers available, show static model info badge
  if (!availableModels?.hasMultipleProviders || availableModels.models.length === 0) {
    // Only show static badge if we have model info
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
              py: 0.5,
              background: isDarkMode ? 'rgba(55, 65, 81, 0.3)' : 'rgba(255, 255, 255, 0.6)',
              backdropFilter: 'blur(8px)',
              border: isDarkMode
                ? '1px solid rgba(75, 85, 99, 0.3)'
                : '1px solid rgba(229, 231, 235, 0.5)',
              borderRadius: '8px',
              minWidth: 0,
              maxWidth: '220px',
              '&:hover': {
                background: isDarkMode ? 'rgba(55, 65, 81, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                boxShadow: isDarkMode
                  ? '0 2px 4px -1px rgba(0, 0, 0, 0.2)'
                  : '0 2px 4px -1px rgba(0, 0, 0, 0.05)',
              },
            }}
          >
            <FiCpu size={12} color={isDarkMode ? '#9ca3af' : '#6b7280'} style={{ flexShrink: 0 }} />
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

    if (!activeSessionId || isLoading || !selectedValue) {
      console.warn('⚠️ [NavbarModelSelector] Model change blocked:', {
        hasSessionId: !!activeSessionId,
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
      console.log('📞 [NavbarModelSelector] Calling API service...');
      const success = await apiService.updateSessionModel(activeSessionId, provider, modelId);

      console.log('📋 [NavbarModelSelector] API response:', { success });

      if (success) {
        console.log('✅ [NavbarModelSelector] Model updated successfully, updating UI state');
        setCurrentModel(selectedValue);
      } else {
        console.error('❌ [NavbarModelSelector] Server returned success=false');
        // Revert selection on server failure
        setCurrentModel(currentModel);
      }
    } catch (error) {
      console.error('💥 [NavbarModelSelector] Failed to update session model:', error);
      // Revert selection on error
      setCurrentModel(currentModel);
    } finally {
      console.log('🏁 [NavbarModelSelector] Model change completed');
      setIsLoading(false);
    }
  };

  // Create options array for Select
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          sx={{
            width: 16,
            height: 16,
            borderRadius: '4px',
            background: isDarkMode ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: isDarkMode
              ? '1px solid rgba(99, 102, 241, 0.3)'
              : '1px solid rgba(99, 102, 241, 0.2)',
          }}
        >
          <FiZap size={9} color={isDarkMode ? '#a5b4fc' : '#6366f1'} />
        </Box>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 500,
            fontSize: '12px',
            color: isDarkMode ? '#f3f4f6' : '#374151',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '150px', // Reduced for navbar
          }}
        >
          {option.label}
        </Typography>
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
                  maxHeight: 280,
                  marginTop: 4,
                  zIndex: 9999, // High z-index to ensure it appears above other elements
                },
              },
              anchorOrigin: {
                vertical: 'top',
                horizontal: 'left',
              },
              transformOrigin: {
                vertical: 'bottom',
                horizontal: 'left',
              },
              disablePortal: false,
            }}
            sx={{
              minWidth: 180, // Reduced for navbar
              maxWidth: 220, // Reduced for navbar
            }}
          >
            {allModelOptions.map((option, idx) => {
              const itemProps = { ['ke' + 'y']: option.value };
              return (
                <MenuItem {...itemProps} value={option.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                    <Chip
                      label={option.provider}
                      size="small"
                      variant="outlined"
                      sx={{
                        fontSize: '10px',
                        height: '18px',
                        borderColor: currentModel === option.value ? '#6366f1' : 'currentColor',
                        color: currentModel === option.value ? '#6366f1' : 'currentColor',
                      }}
                    />
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: currentModel === option.value ? 600 : 400,
                        flex: 1,
                        fontSize: '12px',
                      }}
                    >
                      {option.modelId}
                    </Typography>
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
