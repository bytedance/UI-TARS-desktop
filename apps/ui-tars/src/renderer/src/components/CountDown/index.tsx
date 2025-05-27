import CountUp from 'react-countup';
import { Gift } from 'lucide-react';
import { memo } from 'react';

interface CountDownProps {
  minutes?: number;
}

export const CountDown = memo(({ minutes = 30 }: CountDownProps) => {
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  return (
    <div
      className="flex items-center gap-2 rounded-md bg-green-50 px-3 h-8 text-sm cursor-default"
      style={{ '-webkit-app-region': 'no-drag' }}
    >
      <Gift className="!h-4 !w-4 text-yellow-500" />
      <span className="text-gray-700">
        <span className="font-medium">30</span>-minute free credit
      </span>
      <CountUp
        className="font-mono font-medium"
        start={0}
        end={minutes * 60}
        duration={minutes * 60}
        formattingFn={formatTime}
        useEasing={false}
      />
      <div className="w-0.5 h-4 bg-gray-200"></div>
      <a className="ml-auto text-blue-500 hover:text-blue-600 hover:underline cursor-pointer">
        Go to upgrade
      </a>
    </div>
  );
});
