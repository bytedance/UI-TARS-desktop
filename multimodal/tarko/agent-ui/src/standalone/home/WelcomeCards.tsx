import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/common/hooks/useSession';
import { WelcomeCard } from '@tarko/interface';

interface WelcomeCardsProps {
  cards: WelcomeCard[];
  isLoading?: boolean;
  isDirectChatLoading?: boolean;
}

const WelcomeCards: React.FC<WelcomeCardsProps> = ({ 
  cards, 
  isLoading = false, 
  isDirectChatLoading = false 
}) => {
  const navigate = useNavigate();
  const { createSession, sendMessage } = useSession();
  const [isCardLoading, setIsCardLoading] = useState(false);

  // Group cards by category
  const cardsByCategory = useMemo(() => {
    const grouped = cards.reduce((acc, card) => {
      if (!acc[card.category]) {
        acc[card.category] = [];
      }
      acc[card.category].push(card);
      return acc;
    }, {} as Record<string, WelcomeCard[]>);
    return grouped;
  }, [cards]);

  const categories = Object.keys(cardsByCategory);
  const [activeCategory, setActiveCategory] = useState(categories[0] || '');

  const handleCardClick = async (card: WelcomeCard) => {
    if (isLoading || isDirectChatLoading || isCardLoading) return;

    setIsCardLoading(true);
    navigate('/creating');

    try {
      const sessionId = await createSession();
      navigate(`/${sessionId}`, { replace: true });
      
      // Use prompt as the message content
      await sendMessage(card.prompt);
      
      // TODO: Pass agentOptions to session when supported
      // Currently agentOptions is stored but not used
    } catch (error) {
      console.error('Failed to create session:', error);
      navigate('/', { replace: true });
    } finally {
      setIsCardLoading(false);
    }
  };

  if (cards.length === 0) {
    return null;
  }

  const showTabs = categories.length > 1;
  const activeCards = cardsByCategory[activeCategory] || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      className="w-full max-w-4xl mx-auto mt-8"
    >
      {showTabs && (
        <div className="flex justify-center mb-6">
          <div className="flex bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200/50 dark:border-gray-700/30">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeCategory === category
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
                disabled={isLoading || isDirectChatLoading || isCardLoading}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-4">
        {activeCards.map((card, index) => (
          <motion.div
            key={`${card.category}-${card.title}-${index}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 * index }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="relative bg-white dark:bg-gray-800 rounded-lg border border-gray-200/50 dark:border-gray-700/30 overflow-hidden cursor-pointer hover:shadow-md transition-all duration-200 min-h-[120px]"
            onClick={() => handleCardClick(card)}
          >
            {/* Background Image */}
            {card.image && (
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-20"
                style={{ backgroundImage: `url(${card.image})` }}
              />
            )}
            
            {/* Content Overlay */}
            <div className="relative z-10 p-4 h-full flex flex-col justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2 truncate">
                  {card.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 overflow-hidden" style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical' as const
                }}>
                  {card.prompt}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default WelcomeCards;