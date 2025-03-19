import { useEffect, useRef } from 'react';

interface HtmlPreviewProps {
  content: string;
}

export function HtmlPreview({ content }: HtmlPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current) {
      // 使用 data URL 来加载 HTML 内容
      const blob = new Blob([content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);

      iframeRef.current.src = url;

      // 清理 URL
      return () => {
        URL.revokeObjectURL(url);
      };
    }

    return () => {};
  }, [content]);

  return (
    <iframe
      ref={iframeRef}
      className="w-full rounded-lg border border-gray-200 dark:border-gray-700"
      style={{
        height: 'calc(100vh - 2rem)',
      }}
      sandbox="allow-scripts allow-same-origin"
      title="HTML Preview"
    />
  );
}
