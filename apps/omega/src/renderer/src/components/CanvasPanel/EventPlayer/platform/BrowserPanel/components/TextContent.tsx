import { ContentProps } from '../types';
import { MonacoEditor } from '@renderer/components/MonacoEditor';

export function TextContent({ result }: ContentProps) {
  const content =
    result
      ?.map((item: { type: string; text: string }) => item.text)
      .join('\n') || '';

  return (
    <div className="w-full h-full border border-gray-200 dark:border-gray-700 overflow-hidden">
      {content ? (
        <MonacoEditor language="plaintext" value={content} />
      ) : (
        <div className="flex items-center justify-center h-full text-gray-500">
          Loading content...
        </div>
      )}
    </div>
  );
}
