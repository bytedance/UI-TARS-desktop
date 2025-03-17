import { ContentProps } from '../types';
import { getIconForTool } from '../IconMapping';

export function DefaultContent({ tool, result }: ContentProps) {
  const getScreenshotPath = () => {
    if (Array.isArray(result)) {
      const screenshot = result.find((item) => item.type === 'image');
      return screenshot?.path
        ? `file://${screenshot.path}`
        : screenshot?.content;
    }
    return null;
  };

  const screenshotPath = getScreenshotPath();
  return (
    <div className="p-4">
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          {getIconForTool(tool)}
          <h3 className="text-lg font-semibold">
            {String(tool)
              .replace(/^browser_/, '')
              .replace(/_/g, ' ')}
          </h3>
        </div>
        {screenshotPath && (
          <div className="mt-4">
            <img
              src={screenshotPath}
              alt="Screenshot"
              className="w-full rounded-lg shadow-sm"
            />
          </div>
        )}
      </div>
    </div>
  );
}
