import { useCallback, useState } from 'react';
import { FiSkipBack, FiSkipForward } from 'react-icons/fi';

interface PlayerControlsProps {
  currentTime: number;
  startTime: number;
  endTime: number;
  onPrevious: () => void;
  onNext: () => void;
  onSeek: (timestamp: number) => void;
}

export function PlayerControls({
  currentTime,
  startTime,
  endTime,
  onPrevious,
  onNext,
  onSeek,
}: PlayerControlsProps) {
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  const formatTime = useCallback(
    (timestamp: number) => {
      const duration = Math.floor((timestamp - startTime) / 1000);
      const minutes = Math.floor(duration / 60);
      const seconds = duration % 60;
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    },
    [startTime],
  );

  const progress = ((currentTime - startTime) / (endTime - startTime)) * 100;

  const handleSeek = (value: number) => {
    const timestamp = startTime + ((endTime - startTime) * value) / 100;
    onSeek(timestamp);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percentage = (e.clientX - rect.left) / rect.width;
    const timestamp = startTime + (endTime - startTime) * percentage;
    setHoverTime(timestamp);
  };

  if (startTime === 0 && endTime === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-4 px-4 py-3 border-t border-gray-100 dark:border-gray-800">
      <div className="flex items-center gap-2">
        <button
          onClick={onPrevious}
          className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          <FiSkipBack className="w-5 h-5" />
        </button>
        <button
          onClick={onNext}
          className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          <FiSkipForward className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 flex items-center gap-3">
        <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[48px] flex items-center">
          00:00
        </span>
        <div
          className="relative flex-1"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverTime(null)}
        >
          <input
            type="range"
            min={0}
            max={100}
            value={progress}
            onChange={(e) => handleSeek(Number(e.target.value))}
            className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer"
            style={{
              marginTop: '2px', // 微调垂直位置
            }}
          />
          {hoverTime && (
            <div
              className="absolute bottom-6 -translate-x-1/2 px-2 py-1 text-xs bg-gray-800 text-white rounded pointer-events-none"
              style={{
                left: `${((hoverTime - startTime) / (endTime - startTime)) * 100}%`,
              }}
            >
              {formatTime(hoverTime)}
            </div>
          )}
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[48px] flex items-center">
          {formatTime(endTime)}
        </span>
      </div>
    </div>
  );
}
