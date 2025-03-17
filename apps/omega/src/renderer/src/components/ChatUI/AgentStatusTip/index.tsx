import { agentStatusTipAtom } from '@renderer/state/chat';
import { motion, AnimatePresence } from 'framer-motion';
import { useAtom } from 'jotai';
import { RiSparklingFill } from 'react-icons/ri';

export function AgentStatusTip() {
  const [currentStatusTip] = useAtom(agentStatusTipAtom);

  return (
    <div className="flex items-center justify-center">
      <div className="relative flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 dark:from-blue-400/5 dark:via-purple-400/5 dark:to-pink-400/5 rounded-full border border-gray-200/20 dark:border-gray-700/30 shadow-md dark:shadow-gray-900/30 backdrop-blur-sm">
        <RiSparklingFill className="w-4 h-4 text-blue-500 dark:text-blue-400 animate-pulse" />
        <div className="h-5 overflow-hidden">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={currentStatusTip}
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -16, opacity: 0 }}
              transition={{
                y: { type: 'spring', stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
              className="text-xs font-medium bg-gradient-to-r from-blue-500 to-purple-500 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent mt-0.5"
            >
              {currentStatusTip}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
