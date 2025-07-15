import React from 'react';
import './SectionDivider.css';

export const SectionDivider: React.FC = () => {
  return (
    <div className="relative h-px w-full max-w-5xl mx-auto my-8 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
      <div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
        style={{ animation: 'pulse 4s ease-in-out infinite' }}
      />
    </div>
  );
};
