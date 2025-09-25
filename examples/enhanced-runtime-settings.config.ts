// Enhanced Runtime Settings Configuration Example
// This demonstrates the new API design with enum labels and UI placement control

export default {
  server: {
    // Enhanced runtime settings with UI placement and enum labels support
    runtimeSettings: {
      // Global placement preference (can be overridden per setting)
      placement: 'chat-bottom', // 'dropdown-item' | 'chat-bottom'

      schema: {
        type: 'object',
        properties: {
          // Boolean setting - appears as toggle button in chat-bottom
          enableThinking: {
            type: 'boolean',
            title: '深度思考',
            default: false,
            description: 'Enable deep thinking mode for complex reasoning',
            icon: 'brain',
            placement: 'chat-bottom', // Override global placement
          },

          // Enum setting with custom labels - appears as segmented control in chat-bottom
          browserMode: {
            type: 'string',
            title: 'Browser Control',
            enum: ['dom', 'visual-grounding', 'hybrid'],
            enumLabels: ['DOM', '视觉', '混合'], // Custom display labels
            default: 'hybrid',
            description: 'Select browser control mode',
            icon: 'browser',
            placement: 'chat-bottom',
          },

          // Setting that appears in dropdown
          advancedMode: {
            type: 'boolean',
            title: 'Advanced Mode',
            default: false,
            description: 'Enable advanced features',
            icon: 'settings',
            placement: 'dropdown-item', // Appears in dropdown
          },

          // Enum setting in dropdown with labels
          searchEngine: {
            type: 'string',
            title: 'Search Engine',
            enum: ['google', 'bing', 'duckduckgo'],
            enumLabels: ['Google', 'Bing', 'DuckDuckGo'],
            default: 'google',
            description: 'Choose search engine',
            icon: 'search',
            placement: 'dropdown-item',
          },
        },
      },

      // Transform function to convert UI settings to agent options
      transform: (runtimeSettings: Record<string, unknown>) => {
        return {
          // Transform thinking setting
          thinking: {
            type: runtimeSettings.enableThinking ? 'enabled' : 'disabled',
          },

          // Transform browser setting
          browser: {
            control: runtimeSettings.browserMode ?? 'hybrid',
          },

          // Transform other settings
          advanced: runtimeSettings.advancedMode ?? false,
          search: {
            engine: runtimeSettings.searchEngine ?? 'google',
          },
        };
      },
    },

    // ... rest of server options
  },
};

// Alternative configuration showing mixed placement
export const mixedPlacementConfig = {
  server: {
    runtimeSettings: {
      // Default placement for all settings
      placement: 'dropdown-item',

      schema: {
        type: 'object',
        properties: {
          // Critical settings appear in chat-bottom for quick access
          thinking: {
            type: 'boolean',
            title: 'Deep Thinking',
            default: false,
            placement: 'chat-bottom', // Override for quick access
          },

          mode: {
            type: 'string',
            title: 'Mode',
            enum: ['fast', 'balanced', 'thorough'],
            enumLabels: ['Fast', 'Balanced', 'Thorough'],
            default: 'balanced',
            placement: 'chat-bottom',
          },

          // Less critical settings stay in dropdown
          debugMode: {
            type: 'boolean',
            title: 'Debug Mode',
            default: false,
            // Uses global placement: 'dropdown-item'
          },

          logLevel: {
            type: 'string',
            title: 'Log Level',
            enum: ['error', 'warn', 'info', 'debug'],
            enumLabels: ['Error', 'Warning', 'Info', 'Debug'],
            default: 'info',
            // Uses global placement: 'dropdown-item'
          },
        },
      },

      transform: (settings: Record<string, unknown>) => ({
        thinking: { enabled: settings.thinking ?? false },
        mode: settings.mode ?? 'balanced',
        debug: settings.debugMode ?? false,
        logging: { level: settings.logLevel ?? 'info' },
      }),
    },
  },
};

// Simple configuration with just enum labels
export const simpleEnumLabelsConfig = {
  server: {
    runtimeSettings: {
      schema: {
        type: 'object',
        properties: {
          language: {
            type: 'string',
            title: 'Language',
            enum: ['en', 'zh', 'ja', 'ko'],
            enumLabels: ['English', '中文', '日本語', '한국어'],
            default: 'en',
          },
        },
      },

      transform: (settings: Record<string, unknown>) => ({
        locale: settings.language ?? 'en',
      }),
    },
  },
};
