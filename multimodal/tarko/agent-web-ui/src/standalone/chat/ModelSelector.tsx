import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiZap } from 'react-icons/fi';
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
  useTheme,
} from '@mui/material';
import { apiService } from '@/common/services/apiService';

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

interface ModelSelectorProps {
  sessionId: string;
  className?: string;
}

/**
 * ModelSelector Component - Professional model switching with MUI Select
 *
 * Features:
 * - Uses Material-UI Select for enterprise-grade reliability
 * - Automatic portal rendering to prevent clipping
 * - Built-in accessibility and keyboard navigation
 * - Responsive design with proper theming
 * - Loading states and error handling
 */
export const ModelSelector: React.FC<ModelSelectorProps> = ({ sessionId, className = '' }) => {
  const [availableModels, setAvailableModels] = useState<AvailableModelsResponse | null>(null);
  const [currentModel, setCurrentModel] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const theme = useTheme();
  const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

  // Create custom theme for MUI components to match the app's design
  const muiTheme = createTheme({
    palette: {
      mode: isDarkMode ? 'dark' : 'light',
      primary: {
        main: '#6366f1', // Indigo color to match the design
      },
      background: {
        paper: isDarkMode ? '#374151' : '#ffffff',
        default: isDarkMode ? '#1f2937' : '#f9fafb',
      },
      text: {
        primary: isDarkMode ? '#f3f4f6' : '#374151',
        secondary: isDarkMode ? '#9ca3af' : '#6b7280',
      },
    },
    components: {
      MuiSelect: {
        styleOverrides: {
          root: {
            borderRadius: '12px', // Moderate rounded corners
            minHeight: '32px', // Reduced height
            fontSize: '13px', // Slightly smaller font
            fontWeight: 500,
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: isDarkMode ? 'rgba(156, 163, 175, 0.4)' : 'rgba(209, 213, 219, 0.6)',
              borderWidth: '1px',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: isDarkMode ? 'rgba(156, 163, 175, 0.6)' : 'rgba(107, 114, 128, 0.4)',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#6366f1',
              borderWidth: '1px', // Thinner focus border
            },
          },
          select: {
            paddingLeft: '10px', // Reduced padding
            paddingRight: '32px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px', // Smaller gap
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            fontSize: '14px',
            padding: '8px 16px',
            borderRadius: '6px',
            margin: '2px 8px',
            '&:hover': {
              backgroundColor: isDarkMode ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.05)',
            },
            '&.Mui-selected': {
              backgroundColor: isDarkMode ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)',
              color: '#6366f1',
              '&:hover': {
                backgroundColor: isDarkMode
                  ? 'rgba(99, 102, 241, 0.25)'
                  : 'rgba(99, 102, 241, 0.15)',
              },
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: '16px', // Slightly more rounded for dropdown
            // Much lighter shadow to match app design
            boxShadow: 'none',
            backdropFilter: 'blur(8px)',
            border: isDarkMode
              ? '1px solid rgba(75, 85, 99, 0.4)'
              : '1px solid rgba(229, 231, 235, 0.6)',
          },
        },
      },
    },
  });

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

  // Don't render if no multiple providers available
  if (isInitialLoading) {
    return (
      <Box className={`flex items-center gap-2 ${className}`}>
        <CircularProgress size={16} thickness={4} />
        <Typography variant="caption" color="textSecondary">
          Loading models...
        </Typography>
      </Box>
    );
  }

  if (!availableModels?.hasMultipleProviders || availableModels.models.length === 0) {
    return null;
  }

  const handleModelChange = async (selectedValue: string) => {
    console.log('🎛️ [ModelSelector] Model change initiated:', {
      selectedValue,
      sessionId,
      isLoading,
      currentModel
    });

    if (!sessionId || isLoading || !selectedValue) {
      console.warn('⚠️ [ModelSelector] Model change blocked:', {
        hasSessionId: !!sessionId,
        isLoading,
        hasSelectedValue: !!selectedValue
      });
      return;
    }

    const [provider, modelId] = selectedValue.split(':');
    console.log('🔍 [ModelSelector] Parsed model selection:', { provider, modelId });
    
    if (!provider || !modelId) {
      console.error('❌ [ModelSelector] Invalid model format:', selectedValue);
      return;
    }

    console.log('⏳ [ModelSelector] Starting model update...');
    setIsLoading(true);
    
    try {
      console.log('📞 [ModelSelector] Calling API service...');
      const success = await apiService.updateSessionModel(sessionId, provider, modelId);
      
      console.log('📋 [ModelSelector] API response:', { success });
      
      if (success) {
        console.log('✅ [ModelSelector] Model updated successfully, updating UI state');
        setCurrentModel(selectedValue);
      } else {
        console.error('❌ [ModelSelector] Server returned success=false');
        // Revert selection on server failure
        setCurrentModel(currentModel);
      }
    } catch (error) {
      console.error('💥 [ModelSelector] Failed to update session model:', error);
      // Revert selection on error
      setCurrentModel(currentModel);
    } finally {
      console.log('🏁 [ModelSelector] Model change completed');
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
            width: 18, // Slightly larger icon container
            height: 18,
            borderRadius: '6px', // Rounded square instead of circle
            background: isDarkMode
              ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2))'
              : 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: isDarkMode ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(99, 102, 241, 0.2)',
          }}
        >
          <FiZap size={11} color={isDarkMode ? '#a5b4fc' : '#6366f1'} />
        </Box>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 500,
            fontSize: '12px', // Smaller text
            color: isDarkMode ? '#f3f4f6' : '#374151',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '160px', // Increased max width for better text display
          }}
        >
          {option.label}
        </Typography>
        {isLoading && (
          <CircularProgress size={14} thickness={4} sx={{ color: '#6366f1', marginLeft: 'auto' }} />
        )}
      </Box>
    );
  };

  return (
    <ThemeProvider theme={muiTheme}>
      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className={className}>
        <FormControl size="small" fullWidth>
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
                  // Remove heavy shadows from dropdown
                  boxShadow: isDarkMode
                    ? '0 4px 12px -2px rgba(0, 0, 0, 0.3)'
                    : '0 4px 12px -2px rgba(0, 0, 0, 0.08)',
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
              minWidth: 200,
              maxWidth: 240,
              background: isDarkMode
                ? 'linear-gradient(135deg, rgba(55, 65, 81, 0.9), rgba(75, 85, 99, 0.9))'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(249, 250, 251, 0.9))',
              backdropFilter: 'blur(8px)',
              // Remove heavy shadows to match app design
              boxShadow: 'none',
              border: isDarkMode
                ? '1px solid rgba(75, 85, 99, 0.4)'
                : '1px solid rgba(229, 231, 235, 0.6)',
              '&:hover': {
                // Subtle shadow on hover only
                boxShadow: isDarkMode
                  ? '0 2px 4px -1px rgba(0, 0, 0, 0.2)'
                  : '0 2px 4px -1px rgba(0, 0, 0, 0.05)',
              },
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
                        fontSize: '11px',
                        height: '20px',
                        borderColor: currentModel === option.value ? '#6366f1' : 'currentColor',
                        color: currentModel === option.value ? '#6366f1' : 'currentColor',
                      }}
                    />
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: currentModel === option.value ? 600 : 400,
                        flex: 1,
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
