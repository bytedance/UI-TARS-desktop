'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useState, useCallback, useEffect } from 'react';
import { useWindowSize } from 'usehooks-ts';
import Sidebar from './Sidebar';

interface ChatBlockProps {
  isVisible: boolean;
  onClose: () => void;
  initialMessage?: string;
}

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

export default function ChatBlock({
  isVisible,
  onClose,
  initialMessage,
}: ChatBlockProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { width: windowWidth } = useWindowSize();
  const isMobile = windowWidth ? windowWidth < 768 : false;
  const [currentUrl] = useState('');

  // Spring configuration for smoother animations
  const springConfig = {
    type: 'spring',
    stiffness: 350,
    damping: 30,
  };

  // Animation variants for the main container
  const containerVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: springConfig,
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      transition: { duration: 0.2 },
    },
  };

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim()) return;

      const newMessage: Message = {
        id: Date.now().toString(),
        content: input,
        role: 'user',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, newMessage]);
      setInput('');
    },
    [input],
  );

  useEffect(() => {
    if (isVisible && initialMessage && messages.length === 0) {
      const newMessage: Message = {
        id: Date.now().toString(),
        content: initialMessage,
        role: 'user',
        timestamp: new Date(),
      };
      setMessages([newMessage]);
    }
  }, [isVisible, initialMessage, messages.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible) return; // Only handle shortcuts when chat is visible

      // Handle ESC to close
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }

      // Handle CMD+Enter or CTRL+Enter to submit
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && input.trim()) {
        e.preventDefault();
        handleSubmit(e as unknown as React.FormEvent);
      }

      // Handle CMD+K or CTRL+K to toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSidebarOpen(!isSidebarOpen);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    onClose,
    handleSubmit,
    input,
    isVisible,
    isSidebarOpen,
    setIsSidebarOpen,
  ]);

  return (
    <AnimatePresence mode="sync">
      {isVisible && (
        <motion.div
          className="flex flex-row h-dvh w-dvw fixed top-0 left-0 z-50 bg-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {!isMobile && (
            <Sidebar
              messages={messages}
              input={input}
              setInput={setInput}
              handleSubmit={handleSubmit}
              isOpen={isSidebarOpen}
              onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
            />
          )}

          <motion.div
            className="fixed bg-white h-dvh flex flex-col"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            layoutId="chat-content"
          >
            <motion.div
              className="p-6 flex justify-between items-center border-b border-gray-200"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-4">
                {!isMobile && (
                  <motion.button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-2 hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors "
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isSidebarOpen ? '←' : '→'}
                  </motion.button>
                )}
                <h2 className="text-lg font-ppneue text-gray-900">Browser</h2>
              </div>
              <motion.button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors font-ppsupply"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Close
              </motion.button>
            </motion.div>

            <motion.div
              className="flex-1 p-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="w-full h-full bg-gray-50 border border-gray-200 shadow-sm  overflow-hidden flex flex-col">
                {/* Browser Chrome */}
                <div className="w-full bg-white border-b border-gray-200">
                  {/* Window Controls */}
                  <div className="h-12 flex items-center px-4 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                    </div>
                  </div>
                  {/* Navigation Bar */}
                  <div className="h-12 flex items-center px-4 gap-4">
                    <button className="text-gray-400 hover:text-gray-600 font-ppsupply">
                      ←
                    </button>
                    <button className="text-gray-400 hover:text-gray-600 font-ppsupply">
                      →
                    </button>
                    <button className="text-gray-400 hover:text-gray-600 font-ppsupply">
                      ↻
                    </button>
                    <div className="flex-1 px-4 py-1.5 bg-gray-100 text-sm text-gray-600 font-ppsupply">
                      {currentUrl || 'about:blank'}
                    </div>
                  </div>
                </div>

                {/* Browser Content */}
                <div className="flex-1 bg-white">
                  <iframe
                    className="w-full h-full border-none"
                    src={
                      initialMessage
                        ? `https://www.google.com/search?q=${encodeURIComponent(initialMessage)}`
                        : ''
                    }
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation"
                    title="Browser Content"
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
