import React from 'react';
import { motion } from 'framer-motion';

interface ShowcaseHeaderProps {
  title: string;
  description: string;
}

export const ShowcaseHeader: React.FC<ShowcaseHeaderProps> = ({ title, description }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative mb-12"
    >
      <div className="absolute -top-20 -left-20 w-64 h-64 bg-purple-600/20 rounded-full filter blur-3xl opacity-20" />
      <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-blue-600/20 rounded-full filter blur-3xl opacity-20" />

      <div className="relative">
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
          {title}
        </h1>
        <p className="text-xl text-gray-400">{description}</p>
      </div>
    </motion.div>
  );
};
