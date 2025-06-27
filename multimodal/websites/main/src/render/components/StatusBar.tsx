import React from 'react';
import { motion } from 'framer-motion';
import { FiAlertTriangle } from 'react-icons/fi';

export const StatusBar: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 bg-amber-500 text-black z-[100] py-2 px-4 shadow-md"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-center text-center gap-2">
        <FiAlertTriangle className="text-black text-lg" />
        <p className="text-sm font-medium">
          This website has been archived. Please visit the new Agent TARS website at{' '}
          <a
            href="https://agent-tars.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-bold hover:text-amber-800"
          >
            agent-tars.com
          </a>
        </p>
      </div>
    </motion.div>
  );
};
