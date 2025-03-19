import { useAppChat } from '@renderer/hooks/useAppChat';
import { UserInteruptArea } from './UserInteruptArea';
import { useThemeMode } from '@renderer/hooks/useThemeMode';
import { isReportHtmlMode } from '@renderer/constants';
import { PlanTaskStatus } from './PlanTaskStatus';
import { Replay } from './Replay';
// import { PlanTaskStatus } from './PlanTaskStatus';

export function BeforeInputContainer() {
  const { messageSending } = useAppChat();
  const isDarkMode = useThemeMode();
  return (
    <div
      className="flex flex-col w-full mx-auto"
      style={{
        maxWidth: '800px',
        minWidth: 'min(100% - 20px, 800px)',
      }}
    >
      {messageSending ? (
        <div className="flex flex-col items-center">
          <PlanTaskStatus />
          <UserInteruptArea isDark={isDarkMode.value} />
        </div>
      ) : null}
      {isReportHtmlMode ? <Replay /> : null}
    </div>
  );
}
