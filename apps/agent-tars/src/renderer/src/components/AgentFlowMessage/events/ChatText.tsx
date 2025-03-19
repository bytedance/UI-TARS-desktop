import { getFileIcon, MarkdownRenderer } from '@vendor/chat-ui';
import { EventContentDescriptor, EventItem } from '@renderer/type/event';
import { ErrorBoundary } from '@renderer/components/ErrorBoundary';
import { FiPaperclip } from 'react-icons/fi';
import path from 'path-browserify';
import { useAtom } from 'jotai';
import { canvasStateManager } from '@renderer/state/canvas';
import { CanvasType } from '@renderer/type/canvas';
import { ipcClient } from '@renderer/api';
import { isReportHtmlMode } from '@renderer/constants';

interface AttachmentItemProps {
  path: string;
  onClick: (path: string) => void;
}

const AttachmentItem = ({ path: filePath, onClick }: AttachmentItemProps) => {
  const fileName = path.basename(filePath);

  const getIcon = () => {
    return getFileIcon(filePath);
  };

  const Icon = getIcon();

  return (
    <div
      onClick={() => onClick(filePath)}
      className="group flex items-center gap-3 p-3 rounded-lg border border-gray-200
        dark:border-gray-700 bg-white dark:bg-gray-800
        hover:bg-gray-50 dark:hover:bg-gray-750
        cursor-pointer transition-all duration-200"
    >
      <div className="p-2 rounded-md bg-gray-100 dark:bg-gray-700">
        <div className="p-1 text-gray-600 dark:text-gray-300 flex justify-end items-center">
          {Icon}
        </div>
      </div>

      <div className="flex-grow min-w-0">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {fileName}
        </div>
      </div>
    </div>
  );
};

export function ChatText({ event }: { event: EventItem }) {
  const eventContent = event.content as EventContentDescriptor['chat-text'];
  const [, updateCanvasState] = useAtom(canvasStateManager.updateState);

  const handleAttachmentClick = async (filePath: string) => {
    let content: string | null = null;
    if (isReportHtmlMode) {
      const artifacts = window.__OMEGA_REPORT_DATA__?.artifacts || {};
      const fileName = filePath.split('/').pop()!;
      content = artifacts[fileName].content || '';
    } else {
      content = await ipcClient.getFileContent({
        filePath,
      });
    }

    if (!content) {
      return;
    }

    updateCanvasState({
      isVisible: true,
      dataSource: {
        type: CanvasType.ArtifactPreview,
        data: {
          filePath,
          content: content,
        },
      },
    });
  };

  return (
    <div className="px-4">
      <ErrorBoundary
        fallback={<div className="text-gray-400">{event.content}</div>}
      >
        <MarkdownRenderer content={eventContent.text} />

        {eventContent.attachments && eventContent.attachments.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
              <FiPaperclip className="w-4 h-4" />
              <span>Attachments</span>
            </div>

            <div className="space-y-2">
              {eventContent.attachments.map((attachment, index) => (
                <AttachmentItem
                  key={index}
                  path={attachment.path}
                  onClick={handleAttachmentClick}
                />
              ))}
            </div>
          </div>
        )}
      </ErrorBoundary>
    </div>
  );
}
