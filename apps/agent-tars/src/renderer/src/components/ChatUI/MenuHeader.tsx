import Logo from '../../assets/logo.png';
import { IoShareSocialOutline } from 'react-icons/io5';
import {
  HiOutlineChevronDoubleLeft,
  HiOutlineChevronDoubleRight,
} from 'react-icons/hi';
import { useAtom } from 'jotai';
import { showCanvasAtom } from '@renderer/state/canvas';
import { isReportHtmlMode } from '@renderer/constants';
import { useAppChat } from '@renderer/hooks/useAppChat';
import { useDisclosure } from '@nextui-org/react';
import { ShareModal } from './ShareModal';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useChatSessions } from '@renderer/hooks/useChatSession';
import styles from './MenuHeader.module.scss';

export function MenuHeader() {
  const [showCanvas, setShowCanvas] = useAtom(showCanvasAtom);
  const { messages } = useAppChat();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isShareHovered, setIsShareHovered] = useState(false);
  const [isPanelHovered, setIsPanelHovered] = useState(false);
  const { chatSessions, currentSessionId } = useChatSessions({
    appId: 'omega-agent',
  });
  const currentSession = chatSessions.find(
    (session) => session.id === currentSessionId,
  );
  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${styles.menuHeader} w-full border-b border-divider backdrop-blur-md backdrop-saturate-150 px-6 py-3 sticky top-0 z-10 shadow-sm`}
    >
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <motion.div
          className="flex items-center justify-center"
          whileHover={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
          {/* Logo */}
          <motion.img
            src={Logo}
            alt="Agent TARS Logo"
            className="w-9 h-9 object-contain"
            whileHover={{ rotate: 10, scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 300 }}
          />
        </motion.div>

        {isReportHtmlMode ? (
          <div className="flex-1 mx-6 text-center w-[250px]">
            <h1 className="text-sm md:text-base font-medium text-foreground/90 truncate">
              {currentSession?.name || 'New Session'}
            </h1>
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          {!isReportHtmlMode && (
            <motion.button
              onMouseEnter={() => setIsShareHovered(true)}
              onMouseLeave={() => setIsShareHovered(false)}
              onClick={onOpen}
              className="p-2 rounded-xl bg-background hover:bg-primary/5 border border-divider hover:border-primary/30 transition-all duration-200 relative group"
              title="Share"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              <IoShareSocialOutline
                size={18}
                className={`${isShareHovered ? 'text-primary' : 'text-foreground/70'} transition-colors duration-200`}
              />
              <motion.span
                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                animate={
                  isShareHovered
                    ? { opacity: 1, y: 0, scale: 1 }
                    : { opacity: 0, y: 10, scale: 0.8 }
                }
                className="absolute -bottom-8 left-0 transform -translate-x-1/2 text-xs bg-background/90 backdrop-blur-sm px-2 py-1 rounded-md border border-divider whitespace-nowrap"
              >
                Share
              </motion.span>
            </motion.button>
          )}

          <motion.button
            onMouseEnter={() => setIsPanelHovered(true)}
            onMouseLeave={() => setIsPanelHovered(false)}
            onClick={() => setShowCanvas(!showCanvas)}
            className="p-2 rounded-xl bg-background hover:bg-primary/5 border border-divider hover:border-primary/30 transition-all duration-200 relative group"
            title={showCanvas ? 'Hide Panel' : 'Show Panel'}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              {showCanvas ? (
                <HiOutlineChevronDoubleRight
                  size={18}
                  className={`${isPanelHovered ? 'text-primary' : 'text-foreground/70'} transition-colors duration-200`}
                />
              ) : (
                <HiOutlineChevronDoubleLeft
                  size={18}
                  className={`${isPanelHovered ? 'text-primary' : 'text-foreground/70'} transition-colors duration-200`}
                />
              )}
            </motion.div>
            <motion.span
              initial={{ opacity: 0, y: 10, scale: 0.8 }}
              animate={
                isPanelHovered
                  ? { opacity: 1, y: 0, scale: 1 }
                  : { opacity: 0, y: 10, scale: 0.8 }
              }
              className="absolute -bottom-8 left-0 transform -translate-x-1/4 text-xs bg-background/90 backdrop-blur-sm px-2 py-1 rounded-md border border-divider whitespace-nowrap"
            >
              {showCanvas ? 'Hide' : 'Show'}
            </motion.span>
          </motion.button>
        </div>
      </div>

      <ShareModal isOpen={isOpen} onClose={onClose} messages={messages} />
    </motion.header>
  );
}
