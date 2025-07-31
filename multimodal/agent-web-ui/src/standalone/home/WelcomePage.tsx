import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FiArrowRight, FiArrowUpRight } from 'react-icons/fi';
import { useSession } from '@/common/hooks/useSession';

const WelcomePage: React.FC = () => {
  const navigate = useNavigate();
  const { createSession, sendMessage, sessions } = useSession();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDirectChatLoading, setIsDirectChatLoading] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Focus the input field when component mounts
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Handle text input and auto-resize
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const target = e.target;
    setQuery(target.value);

    // Reset height to recalculate proper scrollHeight
    target.style.height = 'auto';
    // Set to scrollHeight but max 200px
    target.style.height = `${Math.min(target.scrollHeight, 150)}px`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    setIsLoading(true);

    try {
      // Create a new session
      const sessionId = await createNewSession();
      navigate(`/${sessionId}`);

      // Store the query for later use but navigate without query parameter
      const userQuery = query;

      // Navigate to the session route without query parameters
      navigate(`/${sessionId}`);

      // After navigation, the SessionRouter component will handle setting the active session
      // We can send the message after a short delay to ensure the session is properly initialized
      setTimeout(() => {
        sendMessage(userQuery).catch((error) => {
          console.error('Failed to send initial message:', error);
        });
      }, 500);
    } catch (error) {
      console.error('Failed to create session:', error);
      setIsLoading(false);
    }
  };

  // Function to handle direct chat without entering a query
  const handleDirectChat = async () => {
    if (isDirectChatLoading) return;

    setIsDirectChatLoading(true);

    try {
      // Check if there are existing sessions
      if (sessions && sessions.length > 0) {
        // Find the latest session and navigate
        const latestSession = sessions[0]; // Assuming sessions are sorted by time in descending order
        navigate(`/${latestSession.id}`);
      } else {
        // If no existing sessions, create a new session
        const sessionId = await createSession();
        navigate(`/${sessionId}`);
      }
    } catch (error) {
      console.error('Failed to navigate to chat:', error);
    } finally {
      setIsDirectChatLoading(false);
    }
  };

  const createNewSession = async () => {
    const sessionId = await createSession();
    return sessionId;
  };

  // Handle key press events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter to submit
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const examplePrompts = [
    'Search for the latest GUI Agent papers',
    'Find information about UI TARS',
    'Tell me the top 5 most popular projects on ProductHunt today',
    'Please book me the earliest flight from Hangzhou to Shenzhen on 10.1',
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Subtle background gradient */}
      <div className="fixed inset-0 bg-gradient-to-b from-transparent to-gray-100/50 dark:to-gray-800/50 pointer-events-none"></div>

      {/* Header with logo */}
      <header className="relative z-10 pt-8 px-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <motion.img
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              src="https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/appicon.png"
              className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto text-white dark:text-gray-900 cursor-pointer mr-3"
              alt="Agent TARS"
            />
            <span className="text-xl font-display font-bold text-gray-900 dark:text-gray-100">
              Agent TARS
            </span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 relative z-10 flex flex-col items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-gray-100 dark:via-gray-200 dark:to-gray-300 text-transparent bg-clip-text mb-4">
            An multimodal AI agent
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Offering seamless integration with a wide range of real-world tools.
          </p>
        </motion.div>

        {/* Search form - Enlarged and modified for textarea */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-3xl mx-auto mb-8"
        >
          <form onSubmit={handleSubmit} className="relative">
            <div className="relative overflow-hidden rounded-2xl transition-all duration-300 group">
              {/* Animated gradient border */}
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 animate-border-flow opacity-70 group-hover:opacity-100 transition-opacity"></div>

              {/* Textarea field - Replaced input with textarea */}
              <div className="relative m-[2px] rounded-[calc(1rem-2px)] bg-white dark:bg-gray-800 p-2">
                <textarea
                  ref={inputRef}
                  value={query}
                  onChange={handleInput}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Agent TARS anything..."
                  className="w-full px-6 py-4 text-lg bg-transparent outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-none min-h-[100px]"
                  disabled={isLoading || isDirectChatLoading}
                  rows={3}
                />

                {/* Submit button */}

                <div className="absolute right-4 bottom-4 flex items-center">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    disabled={!query.trim() || isLoading || isDirectChatLoading}
                    className={`p-4 rounded-xl transition-all duration-200 ${
                      !query.trim() || isLoading || isDirectChatLoading
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                    }`}
                  >
                    {isLoading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <svg
                          className="w-6 h-6"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </motion.div>
                    ) : (
                      <FiArrowRight size={22} />
                    )}
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Direct chat button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.4 }}
              className="flex justify-end mt-3 mr-1"
            >
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleDirectChat}
                disabled={isLoading || isDirectChatLoading}
                className={`flex items-center gap-1.5 py-1.5 px-2 text-sm text-gray-500 dark:text-gray-400 relative group transition-colors duration-300 ${
                  isLoading || isDirectChatLoading
                    ? 'opacity-60 cursor-not-allowed'
                    : 'cursor-pointer group-hover:text-gray-900 dark:group-hover:text-gray-100'
                }`}
                type="button"
              >
                <span className="group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors duration-300">
                  Go to task history
                </span>
                {isDirectChatLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4"
                  >
                    <svg
                      className="w-4 h-4 text-gray-500 dark:text-gray-400"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </motion.div>
                ) : (
                  <FiArrowUpRight
                    className="text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors duration-300"
                    size={14}
                  />
                )}
                <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-gray-500 dark:bg-gray-400 group-hover:w-full group-hover:bg-gray-900 dark:group-hover:bg-gray-100 transition-all duration-300"></span>
              </motion.button>
            </motion.div>

            {/* Example prompts - Simplified */}
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {examplePrompts.map((prompt, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 + index * 0.1 }}
                  type="button"
                  onClick={() => {
                    setQuery(prompt);
                    if (inputRef.current) {
                      // Set height after updating with example prompt
                      setTimeout(() => {
                        if (inputRef.current) {
                          inputRef.current.style.height = 'auto';
                          inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 150)}px`;
                        }
                      }, 0);
                    }
                  }}
                  className="text-sm px-4 py-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200/50 dark:border-gray-700/30 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-300 transition-colors"
                >
                  {prompt}
                </motion.button>
              ))}
            </div>
          </form>
        </motion.div>

        {/* Minimal footer note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="mt-12 text-center"
        >
          <div className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span>Powered by UI-TARS Vision-Language Model</span>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default WelcomePage;
