import { MonacoEditor } from '@renderer/components/MonacoEditor';
import { FileEditPreview } from './FileEditPreview';
import { ToolCallType } from '@renderer/type/agent';
import { Folder } from 'lucide-react';

interface FsPanelProps {
  toolName: string;
  path: string;
  content: string;
  original?: string;
  edits?: Array<{
    oldText: string;
    newText: string;
  }>;
}

export const extractLanguage = (path: string) => {
  const extension =
    path
      ?.split('.')
      ?.pop()
      ?.replace(/\s*[\(\（][^)]*[\)\）]\s*$/, '')
      .split('.')
      .pop() || 'plaintext';
  return extension;
};

export function FsPanel({
  path,
  content,
  original,
  edits,
  toolName,
}: FsPanelProps) {
  if (toolName === ToolCallType.ListAllowedDirectories) {
    const [label, ...dirs] = content.split('\n');
    return (
      <div className="p-4">
        <h3 className="text-lg font-medium mb-4">{label}</h3>
        <div className="space-y-2">
          {dirs.map((dir, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Folder className="w-5 h-5 text-blue-500" />
              <span className="text-sm">{dir}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (original) {
    return (
      <FileEditPreview
        original={original}
        path={path}
        edits={edits}
        content={content}
      />
    );
  }

  return (
    <div className="h-full">
      <MonacoEditor language={extractLanguage(path)} value={content} readOnly />
    </div>
  );
}
