import { ContentProps } from '../types';
import { DefaultTip } from '../../DefaultTip';

export function ScreenshotContent({ params, result }: ContentProps) {
  if (!result) {
    return <DefaultTip description="Taking screenshot..." />;
  }

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <img
        src={result}
        alt="Screenshot"
        className="max-w-full h-auto rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
      />
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Screenshot: {params.name}
        {params.selector && <span className="ml-2">({params.selector})</span>}
      </div>
    </div>
  );
}
