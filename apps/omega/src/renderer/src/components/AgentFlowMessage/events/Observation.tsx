import { EventItem } from '@renderer/type/event';

export function Observation({ event }: { event: EventItem }) {
  const contentString =
    typeof event.content === 'object'
      ? JSON.stringify(event.content, null, 2)
      : String(event.content);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-md p-3 border border-gray-200 dark:border-gray-700 shadow-sm">
      <h4 className="text-sm font-medium mb-2 dark:text-gray-200">
        Observation
      </h4>
      <pre className="bg-gray-50 dark:bg-gray-900 p-3 rounded text-xs text-gray-600 dark:text-gray-300 font-mono overflow-x-auto">
        {contentString}
      </pre>
    </div>
  );
}
