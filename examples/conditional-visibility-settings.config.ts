// Example configuration demonstrating conditional visibility for runtime settings

export default {
  server: {
    runtimeSettings: {
      schema: {
        type: 'object',
        properties: {
          // Primary toggle that controls visibility of other options
          enableAdvanced: {
            type: 'boolean',
            title: 'Advanced Mode',
            default: false,
            placement: 'chat-bottom',
          },
          
          // This option is only visible when enableAdvanced is true
          debugMode: {
            type: 'boolean',
            title: 'Debug Mode',
            default: false,
            placement: 'chat-bottom',
            visible: {
              dependsOn: 'enableAdvanced',
              when: true,
            },
          },
          
          // Browser control mode
          browserMode: {
            type: 'string',
            title: 'Browser Control',
            enum: ['dom', 'visual-grounding', 'hybrid'],
            enumLabels: ['DOM', '视觉', '混合'],
            default: 'hybrid',
            placement: 'chat-bottom',
          },
          
          // This option is only visible when browserMode is 'hybrid'
          hybridStrategy: {
            type: 'string',
            title: 'Hybrid Strategy',
            enum: ['fallback', 'parallel', 'selective'],
            enumLabels: ['Fallback', 'Parallel', 'Selective'],
            default: 'fallback',
            placement: 'dropdown-item',
            visible: {
              dependsOn: 'browserMode',
              when: 'hybrid',
            },
          },
          
          // This option is only visible when browserMode is 'visual-grounding'
          visualAccuracy: {
            type: 'string',
            title: 'Visual Accuracy',
            enum: ['fast', 'balanced', 'precise'],
            enumLabels: ['Fast', 'Balanced', 'Precise'],
            default: 'balanced',
            placement: 'dropdown-item',
            visible: {
              dependsOn: 'browserMode',
              when: 'visual-grounding',
            },
          },
          
          // Always visible thinking option
          enableThinking: {
            type: 'boolean',
            title: '深度思考',
            default: false,
            placement: 'chat-bottom',
          },
        },
      },
      transform: (runtimeSettings: Record<string, unknown>) => {
        return {
          browser: {
            control: runtimeSettings.browserMode ?? 'hybrid',
            hybridStrategy: runtimeSettings.hybridStrategy ?? 'fallback',
            visualAccuracy: runtimeSettings.visualAccuracy ?? 'balanced',
          },
          thinking: runtimeSettings.enableThinking ? 'enabled' : 'disabled',
          debug: runtimeSettings.debugMode ?? false,
          advanced: runtimeSettings.enableAdvanced ?? false,
        };
      },
    },
  },
};