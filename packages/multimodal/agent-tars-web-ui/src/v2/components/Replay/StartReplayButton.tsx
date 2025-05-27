import React from 'react';
import { motion } from 'framer-motion';
import { FiPlayCircle } from 'react-icons/fi';
import { apiService } from '../../services/apiService';
import { useReplay } from '../../hooks/useReplay';

interface StartReplayButtonProps {
  sessionId: string;
}

/**
 * StartReplayButton - Initiates replay mode for a completed session
 * 
 * Design principles:
 * - Subtle, elegant styling that integrates well with chat UI
 * - Clear visual feedback for interaction states
 * - Concise, meaningful label
 */
export const StartReplayButton: React.FC<StartReplayButtonProps> = ({ sessionId }) => {
  const { initReplay } = useReplay();
  const [isLoading, setIsLoading] = React.useState(false);
  
  const handleStartReplay = async () => {
    if (isLoading || !sessionId) return;
    
    setIsLoading(true);
    try {
      // Fetch all events for the session
      const events = await apiService.getSessionEvents(sessionId);
      
      // Initialize replay with events
      await initReplay(events);
    } catch (error) {
      console.error('Failed to start replay:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleStartReplay}
      disabled={isLoading}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200/50 dark:border-gray-700/30 hover:bg-gray-200/70 dark:hover:bg-gray-700/70 transition-colors shadow-sm"
    >
      {isLoading ? (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <FiPlayCircle size={14} />
        </motion.div>
      ) : (
        <FiPlayCircle size={14} />
      )}
      <span>Replay</span>
    </motion.button>
  );
};
