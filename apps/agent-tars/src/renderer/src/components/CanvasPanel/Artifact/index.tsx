import { canvasDataSourceAtom } from '@renderer/state/canvas';
import { MarkdownRenderer } from '@vendor/chat-ui';
import { useAtom } from 'jotai';
import { useMemo } from 'react';
import { HtmlPreview } from './HtmlPreview';
import { ImagePreview } from './ImagePreview';
import { getFileExtension } from './utils';

export enum ArtifactType {
  HTML = 'html',
  Markdown = 'markdown',
  Image = 'image',
  PDF = 'pdf',
}

export interface ArtifactData {
  filePath: string;
  content: string;
  type: ArtifactType;
}

export function Artifact() {
  const [dataSource] = useAtom(canvasDataSourceAtom);

  if (!dataSource) {
    return null;
  }

  const { filePath, content, type } = dataSource.data as ArtifactData;

  const fileType = useMemo(() => {
    if (type) return type;
    return getFileExtension(filePath);
  }, [filePath, type]);

  const renderContent = () => {
    switch (fileType) {
      case ArtifactType.Markdown:
        return (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <MarkdownRenderer content={content} />
          </div>
        );
      case ArtifactType.HTML:
        return <HtmlPreview content={content} />;
      case ArtifactType.Image:
        return <ImagePreview src={`file://${filePath}`} alt={filePath} />;
      case ArtifactType.PDF:
        return (
          <iframe
            src={content}
            className="w-full h-[calc(100vh-2rem)] rounded-lg border border-gray-200 dark:border-gray-700"
          />
        );
      default:
        return (
          <div className="text-gray-500 dark:text-gray-400">
            Unsupported file type
          </div>
        );
    }
  };

  return (
    <div
      className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm h-full flex flex-col"
      style={{
        height: '100vh',
        overflow: 'auto',
      }}
    >
      <div className="mb-2 text-sm text-gray-500 dark:text-gray-400">
        {filePath.split('/').pop()}
      </div>
      <div className="flex flex-col justify-center">{renderContent()}</div>
    </div>
  );
}
