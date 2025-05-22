import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiPlayCircle,
  FiPauseCircle,
  FiSkipForward,
  FiSkipBack,
  FiClock,
  FiMinimize,
} from 'react-icons/fi';
import { useSessionStore } from '../store';
import { Event } from '../types';

interface ReplayControllerProps {
  isVisible: boolean;
}

export const ReplayController: React.FC<ReplayControllerProps> = ({ isVisible }) => {
  const { activeSessionId, processEvents, messages, isProcessing } = useSessionStore();
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayProgress, setReplayProgress] = useState(0);
  const [replaySpeed, setReplaySpeed] = useState(1);
  const [isMinimized, setIsMinimized] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    // In a real implementation, you would fetch events from the backend
    // For now, we'll simulate having events
    if (activeSessionId && isVisible) {
      // This would be replaced with an API call to get events
      // fetchEventsForSession(activeSessionId).then(setEvents);

      // For demonstration, assume events is an array of Event objects
      setEvents([]);
    }
  }, [activeSessionId, isVisible]);

  const startReplay = async () => {
    if (!activeSessionId || events.length === 0) return;

    setIsReplaying(true);
    setReplayProgress(0);

    // Clear current messages before replay
    // In a real implementation, you would store the current messages and restore them after replay

    // Start the replay with progressive rendering
    await processEvents({
      sessionId: activeSessionId,
      events,
      isPlayback: true,
      speed: replaySpeed,
    });

    setIsReplaying(false);
    setReplayProgress(100);
  };

  const pauseReplay = () => {
    // In a real implementation, you would need to pause the event processing
    setIsReplaying(false);
  };

  const changeSpeed = () => {
    // Cycle through speeds: 1x -> 1.5x -> 2x -> 0.5x -> 1x
    const speeds = [1, 1.5, 2, 0.5];
    const nextSpeedIndex = (speeds.indexOf(replaySpeed) + 1) % speeds.length;
    setReplaySpeed(speeds[nextSpeedIndex]);
  };

  if (!isVisible || !activeSessionId || events.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
      className="replay-controller fixed bottom-6 right-6 z-50"
      style={{ transform: isMinimized ? 'scale(0.9)' : 'scale(1)' }}
    >
      <div className="flex items-center gap-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-2 rounded-2xl shadow-sm border border-gray-200/30 dark:border-gray-700/20">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={isReplaying ? pauseReplay : startReplay}
          disabled={isProcessing}
          className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 ${
            isProcessing
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-gray-100/80 dark:hover:bg-gray-700/50'
          }`}
          title={isReplaying ? 'Pause replay' : 'Start replay'}
        >
          {isReplaying ? (
            <FiPauseCircle className="text-primary-500 dark:text-primary-400" size={20} />
          ) : (
            <FiPlayCircle className="text-primary-500 dark:text-primary-400" size={20} />
          )}
        </motion.button>

        <div className="flex flex-col justify-center min-w-[140px] px-1">
          <div className="text-xs mb-1 flex items-center justify-between">
            <span className="text-gray-500 dark:text-gray-400 flex items-center">
              <FiClock size={10} className="mr-1" />
              Replay
            </span>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={changeSpeed}
              className="text-xs text-primary-500 dark:text-primary-400 font-medium"
              title="Change replay speed"
            >
              {replaySpeed}x
            </motion.button>
          </div>
          <div className="h-1.5 w-full bg-gray-200/70 dark:bg-gray-700/30 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: `${replayProgress}%` }}
              className="h-full bg-primary-500/80 dark:bg-primary-500/60 rounded-full"
            />
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setReplayProgress(0)}
          disabled={isProcessing || !isReplaying}
          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 ${
            isProcessing || !isReplaying
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-gray-100/80 dark:hover:bg-gray-700/50'
          }`}
          title="Restart replay"
        >
          <FiSkipBack className="text-gray-500 dark:text-gray-400" size={16} />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setReplayProgress(100)}
          disabled={isProcessing || !isReplaying}
          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 ${
            isProcessing || !isReplaying
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-gray-100/80 dark:hover:bg-gray-700/50'
          }`}
          title="Skip to end"
        >
          <FiSkipForward className="text-gray-500 dark:text-gray-400" size={16} />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsMinimized(!isMinimized)}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 hover:bg-gray-100/80 dark:hover:bg-gray-700/50"
          title={isMinimized ? 'Expand' : 'Minimize'}
        >
          <FiMinimize className="text-gray-500 dark:text-gray-400" size={16} />
        </motion.button>
      </div>

      {replaySpeed !== 1 && <div className="speed-badge">{replaySpeed}x</div>}
    </motion.div>
  );
};
