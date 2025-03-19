import { OpenAgentChatUI } from '@renderer/components/ChatUI';
import { showCanvasAtom } from '@renderer/state/canvas';
import { motion, AnimatePresence } from 'framer-motion';
import { useAtom } from 'jotai';
import { CanvasPanel } from '../CanvasPanel';
import { LeftSidebar } from '../LeftSidebar';
import { Toaster } from 'react-hot-toast';
import { isReportHtmlMode } from '@renderer/constants';
import { FilePermissionHandler } from '../FilePermissionHandler';
import { useFileSystemSettings } from '@renderer/hooks/useFileSystemSettings';

export function AgentApp() {
  const [showCanvas] = useAtom(showCanvasAtom);
  // Initialize file system settings
  useFileSystemSettings();

  return (
    <div className="w-full h-full flex">
      {!isReportHtmlMode ? (
        <div>
          <LeftSidebar />
        </div>
      ) : null}

      <div
        className="flex flex-1 w-full h-full overflow-hidden"
        style={{
          maxHeight: '100vh',
        }}
      >
        <motion.div
          animate={{ width: showCanvas ? '45%' : '100%' }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="flex-shrink-0"
        >
          <OpenAgentChatUI />
        </motion.div>

        <AnimatePresence mode="wait">
          {showCanvas && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '55%', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="flex-shrink-0 bg-background border-l border-divider"
            >
              <CanvasPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <Toaster position="top-center" />
      <FilePermissionHandler />
    </div>
  );
}
