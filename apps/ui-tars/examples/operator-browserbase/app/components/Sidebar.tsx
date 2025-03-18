'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { Message } from './ChatBlock';
import { useWindowSize } from 'usehooks-ts';

interface SidebarProps {
  messages: Message[];
  input: string;
  setInput: (value: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({
  messages,
  input,
  setInput,
  handleSubmit,
  isOpen,
  onToggle,
}: SidebarProps) {
  const { width } = useWindowSize();
  const isMobile = width ? width < 768 : false;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle CMD+K shortcut on desktop
      if (!isMobile && (e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onToggle();
      }

      // Handle Escape on mobile when sidebar is open
      if (isMobile && isOpen && e.key === 'Escape') {
        e.preventDefault();
        onToggle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggle, isMobile, isOpen]);

  const springConfig = {
    type: 'spring',
    stiffness: 350,
    damping: 30,
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="relative w-[400px] bg-white h-dvh shrink-0 border-r border-gray-200 shadow-lg"
          initial={{ x: -400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -400, opacity: 0 }}
          transition={springConfig}
        >
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-ppneue text-gray-900">
                  Chat History
                </h2>
                {!isMobile && (
                  <kbd className="px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-100 rounded-md">
                    ⌘K
                  </kbd>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <AnimatePresence mode="popLayout">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={`mb-6 ${
                      message.role === 'user' ? 'text-right' : 'text-left'
                    }`}
                  >
                    <motion.div
                      className={`inline-block p-4 rounded-xl font-ppsupply ${
                        message.role === 'user'
                          ? 'bg-[#FF3B00] text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                      layoutId={`message-${message.id}`}
                    >
                      {message.content}
                    </motion.div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <motion.form
              onSubmit={handleSubmit}
              className="p-6 border-t border-gray-200 relative"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF3B00] focus:border-transparent font-ppsupply"
                placeholder="Type a message..."
              />
              {!isMobile && (
                <div className="absolute right-8 bottom-9 flex items-center gap-1 text-xs text-gray-400">
                  <kbd className="px-1.5 py-0.5 bg-gray-100 rounded-md">⌘</kbd>
                  <span>+</span>
                  <kbd className="px-1.5 py-0.5 bg-gray-100 rounded-md">↵</kbd>
                </div>
              )}
            </motion.form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
