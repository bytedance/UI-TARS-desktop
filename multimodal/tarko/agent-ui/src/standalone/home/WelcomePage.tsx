import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FiArrowUpRight, FiRefreshCw } from 'react-icons/fi';
import { useSession } from '@/common/hooks/useSession';
import { getWebUIConfig, getLogoUrl, getAgentTitle } from '@/config/web-ui-config';
import { ChatInput } from '@/standalone/chat/MessageInput';
import { ChatCompletionContentPart } from '@tarko/agent-interface';
import { Tooltip } from '@tarko/ui';
import { ThemeToggle } from '@/standalone/components';
import WelcomeCards from './WelcomeCards';
import { HomeAgentOptionsSelectorRef } from './HomeAgentOptionsSelector';
import { useAtomValue } from 'jotai';
import { globalRuntimeSettingsAtom } from '@/common/state/atoms/globalRuntimeSettings';

const WelcomePage: React.FC = () => {
  const navigate = useNavigate();
  const { createSession, sendMessage, sessions, sessionMetadata } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [isDirectChatLoading, setIsDirectChatLoading] = useState(false);
  const homeAgentOptionsRef = useRef<HomeAgentOptionsSelectorRef>(null);
  const globalSettings = useAtomValue(globalRuntimeSettingsAtom);

  const webuiConfig = getWebUIConfig();
  const logoUrl = getLogoUrl();
  const pageTitle = webuiConfig?.title;
  const pageSubtitle = webuiConfig?.subtitle;
  const webclomeTitle = webuiConfig?.welcomTitle ?? webuiConfig?.title;
  const allPrompts = webuiConfig?.welcomePrompts ?? [];
  const welcomeCards = webuiConfig?.welcomeCards ?? [];

  const [displayedPrompts, setDisplayedPrompts] = useState<string[]>([]);
  const [usedPrompts, setUsedPrompts] = useState<Set<string>>(new Set());
  const [isShuffling, setIsShuffling] = useState(false);
  const [truncatedPrompts, setTruncatedPrompts] = useState<Set<string>>(new Set());

  const checkTextTruncation = (element: HTMLElement) => {
    return element.scrollWidth > element.clientWidth;
  };

  const MAX_DISPLAYED_PROMPTS = 3;
  const shouldShowShuffle = allPrompts.length > MAX_DISPLAYED_PROMPTS;

  const getRandomPrompts = (count: number): string[] => {
    if (allPrompts.length === 0) return [];

    const unusedPrompts = allPrompts.filter((prompt) => !usedPrompts.has(prompt));

    if (unusedPrompts.length >= count) {
      const shuffled = [...unusedPrompts].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, count);
    }

    const shuffled = [...allPrompts].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  };

  useEffect(() => {
    if (allPrompts.length > 0) {
      const initialPrompts = getRandomPrompts(Math.min(MAX_DISPLAYED_PROMPTS, allPrompts.length));
      setDisplayedPrompts(initialPrompts);
      setUsedPrompts(new Set(initialPrompts));
    }
  }, [allPrompts.length]);

  const handleShuffle = () => {
    setIsShuffling(true);

    setTimeout(() => {
      const newPrompts = getRandomPrompts(MAX_DISPLAYED_PROMPTS);
      setDisplayedPrompts(newPrompts);

      const newUsedPrompts = new Set([...usedPrompts, ...newPrompts]);
      if (newUsedPrompts.size >= allPrompts.length - 1) {
        setUsedPrompts(new Set(newPrompts));
      } else {
        setUsedPrompts(newUsedPrompts);
      }

      setIsShuffling(false);
    }, 200);
  };

  const handleChatSubmit = async (content: string | ChatCompletionContentPart[]) => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      // Get user selected RuntimeSettings
      const selectedRuntimeSettings = globalSettings.isActive 
        ? globalSettings.selectedValues 
        : {};
      
      // Navigate to creating page with runtime settings
      navigate('/creating', {
        state: {
          query: typeof content === 'string' ? content : JSON.stringify(content),
          runtimeSettings: selectedRuntimeSettings
        }
      });
    } catch (error) {
      console.error('Failed to navigate to creating:', error);
      // navigate('/', { replace: true });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDirectChat = async () => {
    if (isDirectChatLoading) return;

    setIsDirectChatLoading(true);

    try {
      if (sessions && sessions.length > 0) {
        const latestSession = sessions[0];
        navigate(`/${latestSession.id}`);
      } else {
        const sessionId = await createSession(); // No parameters for simple session creation
        navigate(`/${sessionId}`);
      }
    } catch (error) {
      console.error('Failed to navigate to chat:', error);
    } finally {
      setIsDirectChatLoading(false);
    }
  };

  return (
    <div className="flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="fixed inset-0 bg-gradient-to-b from-transparent to-gray-100/50 dark:to-gray-800/50 pointer-events-none"></div>

      {/* Theme Toggle - Fixed Position */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 0.5 }}
        className="fixed top-6 right-6 z-20"
      >
        <ThemeToggle variant="floating" size="medium" />
      </motion.div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 flex flex-col relative z-10 min-h-[100vh]">
        {/* Top Section - Chat Input Area */}
        <div className="flex-none flex flex-col items-center justify-center px-4 pt-[24vh] pb-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-gray-100 dark:via-gray-200 dark:to-gray-300 text-transparent bg-clip-text pb-4">
              {webclomeTitle}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              {pageSubtitle}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="w-full max-w-3xl mx-auto"
          >
            <ChatInput
              onSubmit={handleChatSubmit}
              isDisabled={isLoading || isDirectChatLoading}
              isProcessing={false}
              placeholder={`Ask ${getAgentTitle()} anything...`}
              showAttachments={true}
              showContextualSelector={true}
              autoFocus={true}
              showHelpText={false}
              variant="home"
            />

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

            {displayedPrompts.length > 0 && (
              <div className="mt-6 flex flex-wrap justify-center gap-2 px-4">
                {displayedPrompts.map((prompt, index) => {
                  const isTruncated = truncatedPrompts.has(prompt);

                  const buttonElement = (
                    <motion.button
                      ref={(el) => {
                        if (el) {
                          const isTextTruncated = checkTextTruncation(el);
                          setTruncatedPrompts((prev) => {
                            const newSet = new Set(prev);
                            if (isTextTruncated) {
                              newSet.add(prompt);
                            } else {
                              newSet.delete(prompt);
                            }
                            return newSet;
                          });
                        }
                      }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.4 + index * 0.1 }}
                      type="button"
                      onClick={() => handleChatSubmit(prompt)}
                      className="text-sm px-4 py-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200/50 dark:border-gray-700/30 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-300 transition-colors max-w-[280px] sm:max-w-sm md:max-w-md whitespace-nowrap overflow-hidden text-ellipsis"
                      disabled={isLoading || isDirectChatLoading}
                    >
                      {prompt}
                    </motion.button>
                  );

                  return isTruncated ? (
                    <Tooltip key={`${prompt}-${index}`} title={prompt} placement="top">
                      {buttonElement}
                    </Tooltip>
                  ) : (
                    <div key={`${prompt}-${index}`}>{buttonElement}</div>
                  );
                })}
                {shouldShowShuffle && (
                  <motion.button
                    key={`shuffle-${displayedPrompts.join('-')}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: isShuffling ? 0.5 : 1, y: 0 }}
                    transition={{
                      duration: 0.3,
                      delay: isShuffling ? 0 : 0.4 + displayedPrompts.length * 0.1,
                    }}
                    type="button"
                    onClick={handleShuffle}
                    className="text-sm px-4 py-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200/50 dark:border-gray-700/30 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-300 transition-colors flex items-center gap-1.5"
                    disabled={isLoading || isDirectChatLoading || isShuffling}
                    title="Shuffle"
                  >
                    <motion.div
                      animate={{ rotate: isShuffling ? 360 : 0 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                    >
                      <FiRefreshCw size={14} />
                    </motion.div>
                    <span>Shuffle</span>
                  </motion.button>
                )}
              </div>
            )}
          </motion.div>
        </div>

        {/* Bottom Section - Welcome Cards */}
        {welcomeCards.length > 0 && (
          <div className="flex-none relative z-10 pb-12">
            <WelcomeCards
              cards={welcomeCards}
              isLoading={isLoading}
              isDirectChatLoading={isDirectChatLoading}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default WelcomePage;
