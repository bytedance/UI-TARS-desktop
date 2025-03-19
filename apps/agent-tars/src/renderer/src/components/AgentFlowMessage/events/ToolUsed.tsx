import { EventContentDescriptor, EventItem } from '@renderer/type/event';
import {
  ActionStatus,
  ToolPlatform,
  toolToPlatformMap,
} from '@renderer/type/agent';
import { FiCheck, FiX, FiLoader, FiSearch, FiGlobe } from 'react-icons/fi';
import {
  FiFolder, // FileSystem
  FiTerminal, // CommandLine
  FiSettings, // System
  FiBox, // Default
} from 'react-icons/fi';
import { getLoadingTipFromToolCall } from '@renderer/utils/getLoadingTipForToolCall';
import { getFileIcon } from '@vendor/chat-ui';
import { useAtom } from 'jotai';
import { canvasStateManager } from '@renderer/state/canvas';
import { CanvasType } from '@renderer/type/canvas';
import { currentEventIdAtom } from '@renderer/state/chat';

const platformIcons = {
  [ToolPlatform.FileSystem]: FiFolder,
  [ToolPlatform.CommandLine]: FiTerminal,
  [ToolPlatform.System]: FiSettings,
  [ToolPlatform.Search]: FiSearch,
  [ToolPlatform.Browser]: FiGlobe,
  default: FiBox,
};

const statusIcons = {
  [ActionStatus.Success]: FiCheck,
  [ActionStatus.Failed]: FiX,
  [ActionStatus.Running]: FiLoader,
};

const statusClasses = {
  [ActionStatus.Success]: 'text-emerald-500 dark:text-emerald-400',
  [ActionStatus.Failed]: 'text-rose-500 dark:text-rose-400',
  [ActionStatus.Running]: 'text-sky-500 dark:text-sky-400 animate-spin',
};

export function ToolUsed({ event }: { event: EventItem }) {
  const content = event.content as EventContentDescriptor['tool-used'];
  const { value = '', description = '' } = getLoadingTipFromToolCall(
    content.tool,
    content.params,
    content.status,
  );
  const [, setCurrentEventId] = useAtom(currentEventIdAtom);
  const platform = toolToPlatformMap[content.tool] || ToolPlatform.System;

  const PlatformIcon =
    platformIcons[platform] || platformIcons.default || FiBox;

  const StatusIcon =
    statusIcons[content.status] || statusIcons[ActionStatus.Failed];
  const statusClass =
    statusClasses[content.status] || statusClasses[ActionStatus.Failed];

  const [, updateCanvasState] = useAtom(canvasStateManager.updateState);

  const getSymbolIcon = () => {
    if (
      platform === ToolPlatform.FileSystem &&
      content.tool?.includes('file') &&
      typeof value === 'string'
    ) {
      const icon = getFileIcon(value);
      return (
        icon || (
          <PlatformIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        )
      );
    }

    return (
      <PlatformIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
    );
  };

  const handleClick = () => {
    updateCanvasState({
      isVisible: true,
      dataSource: {
        type: CanvasType.EventPlayer,
        data: {},
      },
    });
    setCurrentEventId(event.id);
  };

  return (
    <div
      onClick={handleClick}
      className="group relative p-4 rounded-lg border border-gray-200 dark:border-gray-700
        bg-white dark:bg-gray-800 shadow-sm
        hover:bg-gray-50 dark:hover:bg-gray-750
        transition-all duration-200 ease-in-out
        cursor-pointer"
    >
      <div className="flex items-center gap-3">
        {/* Platform Icon */}
        <div
          className="flex-shrink-0 p-2 rounded-md
          bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600
          border border-gray-200 dark:border-gray-600
          group-hover:from-gray-100 group-hover:to-gray-200
          dark:group-hover:from-gray-600 dark:group-hover:to-gray-500
          shadow-sm
          transition-all duration-200"
        >
          {platform === ToolPlatform.FileSystem ? (
            <div className="w-5 h-5 flex items-center justify-center">
              {getSymbolIcon()}
            </div>
          ) : (
            <PlatformIcon className="w-5 h-5 text-gray-700 dark:text-gray-200" />
          )}
        </div>

        {/* Content */}
        <div className="flex-grow min-w-0">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
            {description || 'No description'}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {value || 'No value'}
          </div>
        </div>

        {/* Status Icon */}
        <div className={`flex-shrink-0 ${statusClass}`}>
          <StatusIcon className="w-5 h-5" />
        </div>
      </div>

      {/* Hover Effect Overlay */}
      <div
        className="absolute inset-0 rounded-lg border border-gray-300 dark:border-gray-600 opacity-0
        group-hover:opacity-100 transition-opacity pointer-events-none"
      />
    </div>
  );
}
