import { useMemo } from 'react';
import { DefaultTip } from './DefaultTip';
import { MonacoEditor } from '@renderer/components/MonacoEditor';

export function FsPanel({ path, content }: { path: string; content: string }) {
  // Determine language based on file extension
  const language = useMemo(() => {
    const ext = path.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js':
        return 'javascript';
      case 'jsx':
        return 'javascript';
      case 'ts':
        return 'typescript';
      case 'tsx':
        return 'typescript';
      case 'json':
        return 'json';
      case 'md':
        return 'markdown';
      case 'css':
        return 'css';
      case 'html':
        return 'html';
      default:
        return 'plaintext';
    }
  }, [path]);

  return (
    <div className="w-full h-full border border-gray-200 dark:border-gray-700 overflow-hidden">
      {content ? (
        <MonacoEditor language={language} value={content} />
      ) : (
        <DefaultTip description={path} />
      )}
    </div>
  );
}
