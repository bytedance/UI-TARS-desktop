import { motion } from 'framer-motion';
import { EventItem } from '@renderer/type/event';
import { AlertCircle, Clock } from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export function UserInterruption({
  event,
  isLastEvent,
}: {
  event: EventItem;
  isLastEvent: boolean;
}) {
  const timestamp = dayjs(event.timestamp);

  return (
    <motion.div
      initial={
        isLastEvent
          ? {
              opacity: 0,
              scale: 0.95,
            }
          : {
              opacity: 1,
              scale: 1,
            }
      }
      animate={{
        opacity: 1,
        scale: 1,
      }}
      transition={{
        type: 'spring',
        stiffness: 120,
        damping: 15,
        duration: 0.4,
      }}
      className="relative"
    >
      <div className="bg-gradient-to-r from-purple-900/90 to-indigo-900/90 rounded-xl p-4 border border-purple-500/20">
        {/* Glow Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 blur-xl" />

        {/* Content Container */}
        <div className="relative">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-400/30">
                <AlertCircle className="w-5 h-5 text-purple-300" />
              </div>
              <div className="text-lg font-semibold bg-gradient-to-r from-purple-200 to-blue-200 bg-clip-text text-transparent">
                User Interruption Detected
              </div>
            </div>

            <div className="flex items-center space-x-2 text-purple-300/70 text-sm pl-11">
              <Clock className="w-4 h-4" />
              <span title={timestamp.format('YYYY-MM-DD HH:mm:ss')}>
                {timestamp.fromNow()}
              </span>
            </div>
          </div>

          {/* Message */}
          <div className="pl-11 mt-3">
            <div className="text-gray-200 mb-2">
              {(event.content as any).text}
            </div>

            {/* Tech Pattern Background */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,0,255,0.1),transparent)]" />
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
