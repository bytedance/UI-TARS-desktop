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
      className="w-full max-w-7xl mx-auto px-4"
    >
      {showTabs && (
        <div className="flex justify-center mb-8">
          <div className="flex bg-gray-800/50 backdrop-blur-sm rounded-full p-1 border border-gray-700/30">
            {categories.map((category) => {
              const categoryCards = cardsByCategory[category] || [];
              const count = categoryCards.length;
              
              return (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 flex items-center gap-2 ${
                    activeCategory === category
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
                  }`}
                  disabled={isLoading || isDirectChatLoading || isCardLoading}
                >
                  <span>{category}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    activeCategory === category
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-600 text-gray-300'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {activeCards.map((card, index) => (
          <motion.div
            key={`${card.category}-${card.title}-${index}`}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 * index }}
            whileHover={{ y: -8, transition: { duration: 0.2 } }}
            className="group cursor-pointer"
            onClick={() => handleCardClick(card)}
          >
            <div className="relative bg-gray-800/40 backdrop-blur-sm rounded-2xl overflow-hidden border border-gray-700/30 hover:border-gray-600/50 transition-all duration-300 h-64">
              {/* Background Image */}
              {card.image && (
                <div className="absolute inset-0">
                  <img 
                    src={card.image} 
                    alt={card.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/40 to-transparent" />
                </div>
              )}
              
              {/* Fallback Background for cards without images */}
              {!card.image && (
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20" />
              )}
              
              {/* Content */}
              <div className="relative z-10 p-6 h-full flex flex-col justify-between">
                {/* Category Badge */}
                <div className="flex justify-between items-start mb-4">
                  <span className="inline-block px-3 py-1 text-xs font-medium bg-gray-900/60 backdrop-blur-sm text-gray-300 rounded-full border border-gray-700/50">
                    {card.category}
                  </span>
                </div>
                
                {/* Title and Description */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-white group-hover:text-blue-300 transition-colors duration-200 line-clamp-2">
                    {card.title}
                  </h3>
                  <p className="text-sm text-gray-300 line-clamp-3 leading-relaxed">
                    {card.prompt}
                  </p>
                </div>
                
                {/* Hover Effect Arrow */}
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-x-2 group-hover:translate-x-0">
                  <div className="w-8 h-8 bg-blue-600/80 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>
              </div>
              
              {/* Loading Overlay */}
              {isCardLoading && (
                <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-20">
                  <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default WelcomeCards;