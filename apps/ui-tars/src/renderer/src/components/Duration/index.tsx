import { Clock } from 'lucide-react';
import ms from 'ms';

import { Conversation } from '@ui-tars/shared/types';

interface DurationProps {
  timing: Conversation['timing'];
}

const Duration = ({ timing }: DurationProps) => {
  if (typeof timing?.cost !== 'number' || timing.cost < 0) {
    return null;
  }

  return (
    <div className={'flex justify-end mt-1'}>
      <span className="flex items-center gap-1 text-sm text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        {ms(timing.cost, { long: false })}
      </span>
    </div>
  );
};

export default Duration;
