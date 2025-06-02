import { RemoteResourceStatus } from '../../hooks/useRemoteResource';

export const StatusIndicator = ({
  name,
  status,
}: {
  name: string;
  status: RemoteResourceStatus;
}) => {
  const statusConfig = {
    unavailable: {
      icon: '📁',
      title: 'Unavailable',
      description: 'This resource is from history and no longer available',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-600',
    },
    queuing: {
      icon: '⏳',
      title: 'Queuing',
      description: 'Waiting in queue to establish connection',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    connecting: {
      icon: '🔄',
      title: 'Connecting',
      description: `Establishing Cloud ${name} connection...`,
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-600',
    },
    connected: {
      icon: '✅',
      title: 'Connected',
      description: `Cloud ${name} connection established successfully`,
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
    },
    expired: {
      icon: '⏰',
      title: 'Session Expired',
      description: `The Cloud ${name} session has expired. Please create a new chat.`,
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
    },
    error: {
      icon: '❌',
      title: 'Connection Error',
      description: `Failed to establish Cloud ${name} connection. Please try again.`,
      bgColor: 'bg-red-50',
      textColor: 'text-red-600',
    },
  };

  const config = statusConfig[status];

  return (
    <div
      className={`flex flex-col items-center justify-center w-full h-full ${config.bgColor} border-2 border-dashed border-gray-300 rounded-lg`}
    >
      <div className="text-4xl mb-4">{config.icon}</div>
      <h3 className={`text-xl font-semibold mb-2 ${config.textColor}`}>
        {config.title}
      </h3>
      <p className={`text-sm text-center ${config.textColor} opacity-80`}>
        {config.description}
      </p>
      {(status === 'connecting' || status === 'queuing') && (
        <div className="mt-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-current"></div>
        </div>
      )}
    </div>
  );
};
