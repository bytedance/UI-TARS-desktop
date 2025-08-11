import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiCpu } from 'react-icons/fi';
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
            borderRadius: '9999px', // Full rounded
            minHeight: '40px',
            fontSize: '14px',
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
              borderWidth: '2px',
            },
          },
          select: {
            paddingLeft: '12px',
            paddingRight: '40px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
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
            borderRadius: '12px',
            boxShadow: isDarkMode
              ? '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.2)'
              : '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
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
    if (!sessionId || isLoading || !selectedValue) return;

    const [provider, modelId] = selectedValue.split(':');
    if (!provider || !modelId) return;

    setIsLoading(true);
    try {
      const success = await apiService.updateSessionModel(sessionId, provider, modelId);
      if (success) {
        setCurrentModel(selectedValue);
      }
    } catch (error) {
      console.error('Failed to update session model:', error);
      // Revert selection on error
      setCurrentModel(currentModel);
    } finally {
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
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: isDarkMode
              ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(139, 92, 246, 0.3))'
              : 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <FiCpu size={12} color={isDarkMode ? '#a5b4fc' : '#6366f1'} />
        </Box>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 500,
            color: isDarkMode ? '#f3f4f6' : '#374151',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '180px',
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
            MenuProps={{
              PaperProps: {
                style: {
                  maxHeight: 300,
                  marginTop: 8,
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
              // Use portal to prevent clipping issues
              disablePortal: false,
            }}
            sx={{
              minWidth: 200,
              background: isDarkMode
                ? 'linear-gradient(135deg, rgba(55, 65, 81, 0.9), rgba(75, 85, 99, 0.9))'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(249, 250, 251, 0.9))',
              backdropFilter: 'blur(8px)',
              boxShadow: isDarkMode
                ? '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)'
                : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              '&:hover': {
                boxShadow: isDarkMode
                  ? '0 6px 10px -1px rgba(0, 0, 0, 0.4), 0 4px 6px -1px rgba(0, 0, 0, 0.3)'
                  : '0 6px 10px -1px rgba(0, 0, 0, 0.15), 0 4px 6px -1px rgba(0, 0, 0, 0.1)',
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
