// import { Gift, CircleArrowUp } from 'lucide-react';
import { memo, useEffect, useState } from 'react';
import { RemoteResourceStatus } from '@renderer/hooks/useRemoteResource';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@renderer/components/ui/hover-card';
import { Button } from '@renderer/components/ui/button';
import { Operator } from '@main/store/types';

import { OPERATOR_URL_MAP } from '../../const';

interface CountDownProps {
  operator: Operator;
  start?: number;
  status: RemoteResourceStatus;
}

const UpgradeCard = memo(({ operator }: { operator: Operator }) => (
  <HoverCardContent className="w-72 p-4" sideOffset={10}>
    <div>
      {/* <div className="flex items-center gap-2 mb-2"> */}
      {/* <CircleArrowUp className="h-5 w-5" /> */}
      {/* <h3 className="text-lg font-semibold">Upgrade</h3> */}
      {/* </div> */}
      <p className="text-sm text-gray-600 mb-4">
        {OPERATOR_URL_MAP[operator]?.text}
      </p>
      <Button
        className="w-full"
        onClick={() => window.open(OPERATOR_URL_MAP[operator]?.url, '_blank')}
      >
        Learn more
      </Button>
    </div>
  </HoverCardContent>
));

export const CountDown = memo(({ operator, start = 0 }: CountDownProps) => {
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    if (start >= 30 * 60 * 1000) {
      setShowUpgrade(true);
    }
  }, [start]);

  return (
    <div
      className="flex items-center gap-2 rounded-md bg-green-50 px-3 h-8 text-sm cursor-default"
      style={{ '-webkit-app-region': 'no-drag' }}
    >
      <HoverCard
        open={showUpgrade}
        openDelay={0}
        closeDelay={100}
        onOpenChange={setShowUpgrade}
      >
        <HoverCardTrigger asChild>
          <a className="ml-auto text-blue-500 hover:text-blue-600 hover:underline cursor-pointer">
            Learn more
          </a>
        </HoverCardTrigger>
        <UpgradeCard operator={operator} />
      </HoverCard>
    </div>
  );
});
