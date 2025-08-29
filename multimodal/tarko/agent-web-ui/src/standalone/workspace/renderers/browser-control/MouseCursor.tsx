import React from 'react';
import { motion } from 'framer-motion';

interface MouseCursorProps {
  position: { x: number; y: number };
  previousPosition?: { x: number; y: number } | null;
  action?: string;
}

export const MouseCursor: React.FC<MouseCursorProps> = ({ position, previousPosition, action }) => {
  const isClickAction = action && action.includes('click');

  return (
    <motion.div
      className="absolute pointer-events-none"
      initial={
        previousPosition
          ? {
              left: `${previousPosition.x}%`,
              top: `${previousPosition.y}%`,
            }
          : {
              left: `${position.x}%`,
              top: `${position.y}%`,
            }
      }
      animate={{
        left: `${position.x}%`,
        top: `${position.y}%`,
      }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{
        zIndex: 10,
      }}
    >
      <div className="relative">
        {/* Enhanced cursor icon with shadow effect */}
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.3))',
            transform: 'translate(0px, 2px)',
          }}
        >
          <defs>
            <linearGradient id="cursorGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="white" />
              <stop offset="100%" stopColor="#f5f5f5" />
            </linearGradient>
          </defs>
          <path
            d="M5 3L19 12L12 13L9 20L5 3Z"
            fill="url(#cursorGradient)"
            stroke="#000000"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>

        {/* Artistic pulse effect for click actions */}
        {isClickAction && (
          <>
            {/* Multiple layered ripple effects */}
            <motion.div
              className="absolute rounded-full"
              initial={{ opacity: 0.8, scale: 0 }}
              animate={{ opacity: 0, scale: 2.5 }}
              transition={{
                duration: 1.5,
                ease: 'easeOut',
                repeat: Infinity,
              }}
              style={{
                top: '-8px',
                left: '-8px',
                width: '24px',
                height: '24px',
                background:
                  'radial-gradient(circle, rgba(99,102,241,0.6) 0%, rgba(99,102,241,0) 70%)',
                border: '1px solid rgba(99,102,241,0.3)',
              }}
            />
            <motion.div
              className="absolute rounded-full"
              initial={{ opacity: 0.9, scale: 0 }}
              animate={{ opacity: 0, scale: 2 }}
              transition={{
                duration: 1.2,
                ease: 'easeOut',
                delay: 0.2,
                repeat: Infinity,
              }}
              style={{
                top: '-6px',
                left: '-6px',
                width: '20px',
                height: '20px',
                background:
                  'radial-gradient(circle, rgba(99,102,241,0.8) 0%, rgba(99,102,241,0) 70%)',
                border: '1px solid rgba(99,102,241,0.5)',
              }}
            />
            {/* Central highlight dot */}
            <motion.div
              className="absolute rounded-full bg-white"
              initial={{ opacity: 1, scale: 0.5 }}
              animate={{ opacity: 0.8, scale: 1 }}
              transition={{
                duration: 0.7,
                repeat: Infinity,
                repeatType: 'reverse',
              }}
              style={{
                top: '2px',
                left: '2px',
                width: '4px',
                height: '4px',
                boxShadow: '0 0 10px 2px rgba(255,255,255,0.7)',
              }}
            />
          </>
        )}
      </div>
    </motion.div>
  );
};
