import React, { useState, useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { updateSessionMetadataAction } from '@/common/state/actions/sessionActions';
import { apiService } from '@/common/services/apiService';
import { SessionItemMetadata } from '@tarko/interface';
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

interface AgentOptionsSelectorProps {
  className?: string;
  activeSessionId?: string;
  sessionMetadata?: SessionItemMetadata;
  isDarkMode?: boolean;
}

interface AgentOptionsSchema {
  type: string;
  properties: Record<string, any>;
}

interface AgentOptionConfig {
  key: string;
  property: any;
  currentValue: any;
}

// Component for boolean options (switch-like behavior)
const BooleanOption: React.FC<{
  config: AgentOptionConfig;
  onChange: (key: string, value: any) => void;
  isDarkMode: boolean;
}> = ({ config, onChange, isDarkMode }) => {
  const { key, property, currentValue } = config;
  const isChecked = Boolean(currentValue);

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-medium" title={property.description}>
        {property.title || key}
      </span>
      <button
        type="button"
        onClick={() => onChange(key, !isChecked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          isChecked ? 'bg-blue-600' : isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
            isChecked ? 'translate-x-5' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
};

// Component for enum options with 2 values (switch-like behavior)
const BinaryEnumOption: React.FC<{
  config: AgentOptionConfig;
  onChange: (key: string, value: any) => void;
  isDarkMode: boolean;
}> = ({ config, onChange, isDarkMode }) => {
  const { key, property, currentValue } = config;
  const options = property.enum || [];
  const isFirstOption = currentValue === options[0];
  const firstLabel = options[0];
  const secondLabel = options[1];

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-medium" title={property.description}>
        {property.title || key}
      </span>
      <div className="inline-flex rounded border" role="group">
        <button
          type="button"
          onClick={() => onChange(key, options[0])}
          className={`px-2 py-1 text-xs font-medium transition-all ${
            isFirstOption
              ? 'bg-blue-600 text-white'
              : isDarkMode
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-white text-gray-700 hover:bg-gray-50'
          } rounded-l border-r-0`}
        >
          {firstLabel}
        </button>
        <button
          type="button"
          onClick={() => onChange(key, options[1])}
          className={`px-2 py-1 text-xs font-medium transition-all ${
            !isFirstOption
              ? 'bg-blue-600 text-white'
              : isDarkMode
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-white text-gray-700 hover:bg-gray-50'
          } rounded-r`}
        >
          {secondLabel}
        </button>
      </div>
    </div>
  );
};

// Component for enum options with 3+ values (dropdown)
const MultiEnumOption: React.FC<{
  config: AgentOptionConfig;
  onChange: (key: string, value: any) => void;
  isDarkMode: boolean;
}> = ({ config, onChange, isDarkMode }) => {
  const { key, property, currentValue } = config;
  const options = property.enum || [];

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-medium" title={property.description}>
        {property.title || key}
      </span>
      <FormControl size="small">
        <Select
          value={currentValue || options[0]}
          onChange={(event) => onChange(key, event.target.value)}
          size="small"
          style={{ minWidth: '80px', fontSize: '12px' }}
        >
          {options.map((option: any) => (
            <SelectMenuItem key={option} value={option} style={{ fontSize: '12px' }}>
              {option}
            </SelectMenuItem>
          ))}
        </Select>
      </FormControl>
    </div>
  );
};

// Static display when options can't be changed
const StaticAgentOptionsDisplay: React.FC<{
  sessionMetadata: SessionItemMetadata;
  isDarkMode: boolean;
  className?: string;
  isDisabled?: boolean;
  disabledReason?: string;
}> = ({ sessionMetadata, isDarkMode, className, isDisabled = false, disabledReason }) => {
  const { getModelSelectorStyles } = useNavbarStyles();
  const [isHovered, setIsHovered] = React.useState(false);

  if (!sessionMetadata?.agentOptions) {
    return null;
  }

  const optionsCount = Object.keys(sessionMetadata.agentOptions).length;
  const modelStyles = getModelSelectorStyles(isDisabled);

  const content = (
    <div
      className={`${className} transition-transform hover:scale-105 ${isDisabled ? '' : 'cursor-pointer'}`}
    >
      <Box
        style={{
          ...modelStyles.base,
          maxWidth: '200px',
          ...(isHovered && !isDisabled ? modelStyles.hover : {}),
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <span
          style={{
            fontSize: '12px',
            color: isDarkMode ? '#a5b4fc' : '#6366f1',
            fontWeight: 500,
          }}
        >
          Options ({optionsCount})
        </span>
      </Box>
    </div>
  );

  if (isDisabled && disabledReason) {
    return (
      <Tooltip title={disabledReason} placement="bottom">
        <span>{content}</span>
      </Tooltip>
    );
  }

  return content;
};

export const AgentOptionsSelector: React.FC<AgentOptionsSelectorProps> = ({
  className = '',
  activeSessionId,
  sessionMetadata,
  isDarkMode = false,
}) => {
  const [schema, setSchema] = useState<AgentOptionsSchema | null>(null);
  const [currentValues, setCurrentValues] = useState<Record<string, any> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const updateSessionMetadata = useSetAtom(updateSessionMetadataAction);
  const { isReplayMode } = useReplayMode();
  const isProcessing = useAtomValue(isProcessingAtom);

  const loadAgentOptions = async () => {
    if (!activeSessionId) return;

    try {
      const response = await apiService.getSessionAgentOptions(activeSessionId);
      setSchema(response.schema);
      setCurrentValues(response.currentValues);
    } catch (error) {
      console.error('Failed to load agent options:', error);
    }
  };

  const handleOptionChange = async (key: string, value: any) => {
    if (!activeSessionId || isLoading || !currentValues) return;

    const newValues = { ...currentValues, [key]: value };
    setCurrentValues(newValues);

    setIsLoading(true);
    try {
      const response = await apiService.updateSessionAgentOptions(activeSessionId, newValues);
      if (response.success && response.sessionInfo?.metadata) {
        updateSessionMetadata({
          sessionId: activeSessionId,
          metadata: response.sessionInfo.metadata,
        });
      }
    } catch (error) {
      console.error('Failed to update agent options:', error);
      // Revert the change on error
      setCurrentValues(currentValues);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeSessionId && !isReplayMode) {
      loadAgentOptions();
    }
  }, [activeSessionId, isReplayMode]);

  // Don't show anything if no schema or in replay mode
  if (isReplayMode || isProcessing || !schema || !schema.properties) {
    return (
      <StaticAgentOptionsDisplay
        sessionMetadata={sessionMetadata}
        isDarkMode={isDarkMode}
        className={className}
        isDisabled={isProcessing}
        disabledReason={
          isProcessing
            ? 'Agent options unavailable during agent execution. Please wait for agent execution to complete'
            : undefined
        }
      />
    );
  }

  const options = Object.entries(schema.properties).map(([key, property]) => ({
    key,
    property,
    currentValue: currentValues?.[key] ?? property.default,
  }));

  if (options.length === 0) {
    return null;
  }

  const renderOption = (config: AgentOptionConfig) => {
    const { property } = config;

    if (property.type === 'boolean') {
      return (
        <BooleanOption
          key={config.key}
          config={config}
          onChange={handleOptionChange}
          isDarkMode={isDarkMode}
        />
      );
    }

    if (property.type === 'string' && property.enum) {
      if (property.enum.length === 2) {
        return (
          <BinaryEnumOption
            key={config.key}
            config={config}
            onChange={handleOptionChange}
            isDarkMode={isDarkMode}
          />
        );
      } else {
        return (
          <MultiEnumOption
            key={config.key}
            config={config}
            onChange={handleOptionChange}
            isDarkMode={isDarkMode}
          />
        );
      }
    }

    return null;
  };

  return (
    <div className={`${className} relative`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={`transition-transform hover:scale-105 active:scale-95 ${
          isDarkMode
            ? 'bg-gray-800 border-gray-600 text-gray-200'
            : 'bg-white border-gray-300 text-gray-700'
        } border rounded px-3 py-1.5 text-xs font-medium flex items-center gap-2`}
      >
        <span>Options ({options.length})</span>
        {isLoading && <CircularProgress size={12} thickness={4} style={{ color: '#6366f1' }} />}
        <span className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {isOpen && (
        <div
          className={`absolute top-full left-0 mt-1 z-50 min-w-[200px] rounded border shadow-lg ${
            isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'
          }`}
        >
          <div className="p-3 space-y-3">{options.map(renderOption)}</div>
        </div>
      )}

      {/* Backdrop to close dropdown */}
      {isOpen && <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />}
    </div>
  );
};
