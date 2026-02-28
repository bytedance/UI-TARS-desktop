import { memo } from 'react';
import { RemoteResourceStatus } from '@renderer/hooks/useRemoteResource';
import { useTranslation } from '@renderer/hooks/useTranslation';

interface StatusIndicatorProps {
  name: string;
  status: RemoteResourceStatus;
  queueNum?: number | null;
}

const statusConfig = {
  init: {
    icon: '🚀',
    titleKey: 'remote_status.init.title',
    descriptionKey: 'remote_status.init.desc',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
  },
  unavailable: {
    icon: '📁',
    titleKey: 'remote_status.unavailable.title',
    descriptionKey: 'remote_status.unavailable.desc',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-600',
  },
  queuing: {
    icon: '⏳',
    titleKey: 'remote_status.queuing.title',
    descriptionKey: 'remote_status.queuing.desc',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
  },
  connecting: {
    icon: '🔄',
    titleKey: 'remote_status.connecting.title',
    descriptionKey: 'remote_status.connecting.desc',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-600',
  },
  connected: {
    icon: '✅',
    titleKey: 'remote_status.connected.title',
    descriptionKey: 'remote_status.connected.desc',
    bgColor: 'bg-green-50',
    textColor: 'text-green-600',
  },
  expired: {
    icon: '⏰',
    titleKey: 'remote_status.expired.title',
    descriptionKey: 'remote_status.expired.desc',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-600',
  },
  error: {
    icon: '❌',
    titleKey: 'remote_status.error.title',
    descriptionKey: 'remote_status.error.desc',
    bgColor: 'bg-red-50',
    textColor: 'text-red-600',
  },
} as const;

export const StatusIndicator = memo<StatusIndicatorProps>(
  ({ name, status, queueNum }) => {
    const { t } = useTranslation();
    const config = statusConfig[status];

    const title = t(config.titleKey);
    const description = t(config.descriptionKey).replace('{name}', name);

    const renderQueueInfo = () => {
      if (status === 'queuing' && queueNum !== null && queueNum !== undefined) {
        return (
          <div
            className={`mt-2 px-3 py-1 rounded-full text-xs font-medium ${config.textColor} bg-white/50`}
          >
            {t('remote_status.queue_position').replace(
              '{queueNum}',
              String(queueNum),
            )}
          </div>
        );
      }
      return null;
    };

    const renderLoadingSpinner = () => {
      if (status === 'connecting' || status === 'queuing') {
        return (
          <div className="mt-4">
            <div
              className={`animate-spin rounded-full h-6 w-6 border-b-2 border-current ${config.textColor}`}
            />
          </div>
        );
      }
      return null;
    };

    return (
      <div
        className={`flex flex-col items-center justify-center w-full h-full ${config.bgColor} border-2 border-dashed border-gray-300 rounded-lg`}
      >
        <div className="text-4xl mb-4" role="img" aria-label={title}>
          {config.icon}
        </div>

        <h3 className={`text-xl font-semibold mb-2 ${config.textColor}`}>
          {title}
        </h3>

        <p className={`text-sm text-center ${config.textColor} opacity-80`}>
          {description}
        </p>

        {renderQueueInfo()}
        {renderLoadingSpinner()}
      </div>
    );
  },
);

StatusIndicator.displayName = 'StatusIndicator';
