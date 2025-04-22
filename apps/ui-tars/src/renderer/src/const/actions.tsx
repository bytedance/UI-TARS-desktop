import {
  Hand,
  Keyboard,
  Type,
  MousePointerClick,
  ScrollText,
  AlertCircle,
  CheckSquare,
  RotateCcw,
  Hourglass,
  Camera,
} from 'lucide-react';

export const ActionIconMap = {
  scroll: ScrollText,
  drag: Hand,
  hotkey: Keyboard,
  type: Type,
  click: MousePointerClick,
  left_double: MousePointerClick,
  right_single: MousePointerClick,
  error_env: AlertCircle,
  finished: CheckSquare,
  call_user: RotateCcw,
  wait: Hourglass,
  screenshot: Camera,
};
