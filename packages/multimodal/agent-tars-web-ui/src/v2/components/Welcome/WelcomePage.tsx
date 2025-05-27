import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FiArrowRight, FiCommand, FiSearch, FiMonitor, FiFile, FiZap } from 'react-icons/fi';
import { useSession } from '../../hooks/useSession';

const WelcomePage: React.FC = () => {
  const navigate = useNavigate();

  const { createSession, sendMessage } = useSession();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showCapabilities, setShowCapabilities] = useState(false);
  // Added to fix layout shift
  const [pageHeight, setPageHeight] = useState<number | null>(null);

  useEffect(() => {
    // Focus the input field when component mounts
    if (inputRef.current) {
      inputRef.current.focus();
    }

    // Get initial page height before showing capabilities
    setPageHeight(document.body.scrollHeight);

    // Show capabilities after a delay
    const timer = setTimeout(() => {
      setShowCapabilities(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    setIsLoading(true);

    try {
      // Create a new session
      const sessionId = await createSession();

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

  const capabilities = [
    {
      icon: <FiSearch className="text-blue-500" />,
      title: 'Web Search',
      description: 'Find information from across the web',
    },
    {
      icon: <FiMonitor className="text-purple-500" />,
      title: 'Web Browsing',
      description: 'Navigate and interact with websites',
    },
    {
      icon: <FiCommand className="text-green-500" />,
      title: 'Execute Commands',
      description: 'Run system commands and scripts',
    },
    {
      icon: <FiFile className="text-amber-500" />,
      title: 'File Operations',
      description: 'Create, read, and manipulate files',
    },
  ];

  const examplePrompts = [
    'Search for the latest AI research papers',
    'Find information about React hooks and provide examples',
    'Help me debug this Python code',
    'Create a project plan for my new app idea',
  ];

  return (
    <div
      className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800"
      style={pageHeight ? { minHeight: `${pageHeight}px` } : undefined}
    >
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-accent-100/30 dark:bg-accent-900/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -left-40 w-96 h-96 bg-blue-100/30 dark:bg-blue-900/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-100/20 dark:bg-purple-900/10 rounded-full blur-3xl"></div>
      </div>

      {/* Header with logo */}
      <header className="relative z-10 pt-8 px-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-900 dark:bg-gray-100 flex items-center justify-center text-white dark:text-gray-900 font-bold text-xl mr-3">
              A
            </div>
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
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-gray-100 dark:via-gray-200 dark:to-gray-300 text-transparent bg-clip-text mb-4">
            An multimodal AI agent
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            An open-source multimodal AI agent Offering seamless integration with a wide range of
            real-world tools.
          </p>
        </motion.div>

        {/* Search form */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-2xl mx-auto mb-12"
        >
          <form onSubmit={handleSubmit} className="relative">
            <div className="relative overflow-hidden rounded-2xl transition-all duration-300 group">
              {/* Animated gradient border */}
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 animate-border-flow opacity-70 group-hover:opacity-100 transition-opacity"></div>

              {/* Input field */}
              <div className="relative m-[2px] rounded-[calc(1rem-2px)] bg-white dark:bg-gray-800 p-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask Agent TARS anything..."
                  className="w-full px-4 py-5 text-lg bg-transparent outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  disabled={isLoading}
                />

                {/* Submit button */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  disabled={!query.trim() || isLoading}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-3 rounded-xl transition-all duration-200 ${
                    !query.trim() || isLoading
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
                    <FiArrowRight size={20} />
                  )}
                </motion.button>
              </div>
            </div>

            {/* Example prompts */}
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {examplePrompts.map((prompt, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 + index * 0.1 }}
                  type="button"
                  onClick={() => setQuery(prompt)}
                  className="text-xs px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200/50 dark:border-gray-700/30 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-300 transition-colors"
                >
                  {prompt}
                </motion.button>
              ))}
            </div>
          </form>
        </motion.div>

        {/* Reserve space for capabilities with a fixed height container */}
        <div
          className={`w-full max-w-4xl mx-auto transition-all duration-500 ease-in-out ${showCapabilities ? 'opacity-100' : 'opacity-0'}`}
          style={{ minHeight: '300px' }}
        >
          <AnimatePresence>
            {showCapabilities && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-4xl mx-auto"
              >
                <h2 className="text-xl font-display font-semibold text-gray-800 dark:text-gray-200 text-center mb-6">
                  Agent TARS Capabilities
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {capabilities.map((capability, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.6 + index * 0.1 }}
                      className="bg-white dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 border border-gray-100/50 dark:border-gray-700/30 group hover:border-accent-200/60 dark:hover:border-accent-700/40 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center mb-3">
                        {capability.icon}
                      </div>
                      <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                        {capability.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {capability.description}
                      </p>
                    </motion.div>
                  ))}
                </div>

                {/* Additional info */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 1 }}
                  className="mt-10 text-center"
                >
                  <div className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-100/50 dark:border-gray-700/30">
                    <FiZap className="text-amber-500" size={16} />
                    <span>Powered by UI-TARS Vision-Language Model</span>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default WelcomePage;
