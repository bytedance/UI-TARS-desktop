import React from 'react';
import { motion } from 'framer-motion';
import { FiMessageSquare } from 'react-icons/fi';

interface SessionCreatingStateProps {
  isCreating: boolean;
}

/**
 * SessionCreatingState Component - Modern, elegant loading state with quality and emotional value
 */
export const SessionCreatingState: React.FC<SessionCreatingStateProps> = ({ isCreating }) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.15,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  };

  const iconContainerVariants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        duration: 0.7,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  };

  const pulseVariants = {
    pulse: {
      scale: [1, 1.05, 1],
      transition: {
        duration: 2.5,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  };



  const floatingDots = {
    float: {
      y: [-8, 8, -8],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  };

  if (!isCreating) {
    return null;
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="flex items-center justify-center h-full"
    >
      <div className="text-center max-w-sm mx-auto px-6">
        {/* Enhanced icon with modern design */}
        <motion.div variants={iconContainerVariants} className="relative mb-8">
          {/* Background glow */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 rounded-full blur-xl"
            animate={{
              scale: [0.8, 1.2, 0.8],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          {/* Main icon container */}
          <motion.div
            className="relative w-20 h-20 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto shadow-lg border border-gray-200/50 dark:border-gray-700/50"
            variants={pulseVariants}
            animate="pulse"
          >

            {/* Icon */}
            <div className="relative z-10">
              <motion.div
                animate={{
                  rotate: [0, 180, 360],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="text-blue-600 dark:text-blue-400"
              >
                <FiMessageSquare size={28} />
              </motion.div>
            </div>

            {/* Accent dot */}
            <motion.div
              className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 dark:bg-blue-400 rounded-full"
              animate={{
                scale: [0.8, 1.1, 0.8],
                opacity: [0.6, 1, 0.6],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </motion.div>

          {/* Floating decorative elements */}
          <motion.div
            className="absolute -top-2 -left-2 w-2 h-2 bg-blue-400/60 rounded-full"
            variants={floatingDots}
            animate="float"
          />
          <motion.div
            className="absolute -bottom-2 -right-2 w-1.5 h-1.5 bg-purple-400/60 rounded-full"
            variants={floatingDots}
            animate="float"
            transition={{ delay: 1 }}
          />
        </motion.div>

        {/* Clean title */}
        <motion.h2
          variants={itemVariants}
          className="text-2xl font-semibold mb-3 text-gray-900 dark:text-gray-100 tracking-tight"
        >
          Preparing your session
        </motion.h2>

        {/* Elegant description */}
        <motion.p
          variants={itemVariants}
          className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed"
        >
          Setting up your Agent workspace with care
        </motion.p>

        {/* Clean progress indicator */}
        <motion.div variants={itemVariants} className="flex items-center justify-center">
          <div className="flex space-x-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full"
                animate={{
                  scale: [0.7, 1.2, 0.7],
                  opacity: [0.4, 0.8, 0.4],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.3,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
