import { EventItem } from '@renderer/type/event';
import { useEffect, useState } from 'react';

const colors = [
  'rgb(239, 68, 68)', // red-500
  'rgb(249, 115, 22)', // orange-500
  'rgb(234, 179, 8)', // yellow-500
  'rgb(34, 197, 94)', // green-500
  'rgb(59, 130, 246)', // blue-500
  'rgb(168, 85, 247)', // purple-500
];

export function LoadingStatus({
  title,
  event,
}: {
  title: string;
  event?: EventItem;
}) {
  const [colorIndex, setColorIndex] = useState(0);
  const loadingTitle = event?.content.title ?? title;

  useEffect(() => {
    const interval = setInterval(() => {
      setColorIndex((i) => (i + 1) % colors.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative">
      <div className="flex items-center bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="relative mr-3">
          <div
            className="w-3 h-3 rounded-full animate-spin-slow transition-colors duration-1000 shadow-lg"
            style={{
              backgroundColor: colors[colorIndex],
              animation: 'spin 3s linear infinite',
              transform: 'perspective(100px) rotateX(10deg) rotateY(10deg)',
              boxShadow: `0 0 10px ${colors[colorIndex]}40, inset 2px 2px 4px rgba(255,255,255,0.5), inset -2px -2px 4px rgba(0,0,0,0.2)`,
            }}
          />
          <div
            className="absolute inset-0 rounded-full animate-ping opacity-40"
            style={{ backgroundColor: colors[colorIndex] }}
          />
          <div
            className="absolute -inset-1 rounded-full animate-pulse opacity-20 blur-sm"
            style={{ backgroundColor: colors[colorIndex] }}
          />
        </div>
        <div>
          <h4 className="text-sm font-medium tracking-wide text-gray-800 dark:text-gray-200 ml-1">
            {loadingTitle}
          </h4>
        </div>
      </div>
    </div>
  );
}
