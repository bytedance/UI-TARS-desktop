import { useState } from 'react';
import { MonacoEditor } from '@renderer/components/MonacoEditor';
import { extractLanguage } from './index';

interface FileEditPreviewProps {
  original: string;
  path: string;
  edits:
    | Array<{
        oldText: string;
        newText: string;
      }>
    | undefined;
  content: string;
}

function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, '\n');
}

function applyEdits(
  content: string,
  edits: FileEditPreviewProps['edits'],
): string {
  let modifiedContent = normalizeLineEndings(content);

  for (const edit of edits || []) {
    const normalizedOld = normalizeLineEndings(edit.oldText);
    const normalizedNew = normalizeLineEndings(edit.newText);

    if (modifiedContent.includes(normalizedOld)) {
      modifiedContent = modifiedContent.replace(normalizedOld, normalizedNew);
      continue;
    }

    // Try line-by-line matching
    const oldLines = normalizedOld.split('\n');
    const contentLines = modifiedContent.split('\n');

    for (let i = 0; i <= contentLines.length - oldLines.length; i++) {
      const potentialMatch = contentLines.slice(i, i + oldLines.length);
      const isMatch = oldLines.every(
        (oldLine, j) => oldLine.trim() === potentialMatch[j].trim(),
      );

      if (isMatch) {
        const originalIndent = contentLines[i].match(/^\s*/)?.[0] || '';
        const newLines = normalizedNew.split('\n').map((line, j) => {
          if (j === 0) return originalIndent + line.trimStart();
          const oldIndent = oldLines[j]?.match(/^\s*/)?.[0] || '';
          const newIndent = line.match(/^\s*/)?.[0] || '';
          if (oldIndent && newIndent) {
            const relativeIndent = newIndent.length - oldIndent.length;
            return (
              originalIndent +
              ' '.repeat(Math.max(0, relativeIndent)) +
              line.trimStart()
            );
          }
          return line;
        });

        contentLines.splice(i, oldLines.length, ...newLines);
        modifiedContent = contentLines.join('\n');
        break;
      }
    }
  }

  return modifiedContent;
}

export function FileEditPreview({
  original,
  path,
  edits,
  content,
}: FileEditPreviewProps) {
  const [activeTab, setActiveTab] = useState<'original' | 'diff' | 'new'>(
    'original',
  );

  const newContent = edits ? applyEdits(original, edits) : content;

  const tabs = [
    { id: 'original', label: 'Original' },
    { id: 'diff', label: 'Diff' },
    { id: 'new', label: 'New' },
  ] as const;

  return (
    <div className="h-full flex flex-col">
      <div className="flex gap-2 px-4 border-b border-gray-200 dark:border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`

              group relative px-4 py-2.5 text-sm font-medium transition-all duration-200
              ${
                activeTab === tab.id
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-primary-500 dark:hover:text-primary-300'
              }
            `}
          >
            {tab.label}
            <span
              className={`
                absolute bottom-0 left-0 w-full h-0.5 transform origin-left transition-transform duration-300 ease-out
                ${
                  activeTab === tab.id
                    ? 'bg-primary-500 dark:bg-primary-400 scale-x-100'
                    : 'bg-primary-400 dark:bg-primary-300 scale-x-0 group-hover:scale-x-100'
                }
              `}
            />
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden pt-4">
        {activeTab === 'original' && (
          <MonacoEditor
            language={extractLanguage(path)}
            value={original}
            readOnly
          />
        )}
        {activeTab === 'diff' && (
          <MonacoEditor
            language={extractLanguage(path)}
            value={newContent || ''}
            original={original}
            isDiff
            readOnly
          />
        )}
        {activeTab === 'new' && (
          <MonacoEditor
            language={extractLanguage(path)}
            value={newContent || ''}
            readOnly
          />
        )}
      </div>
    </div>
  );
}
