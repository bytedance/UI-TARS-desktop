import React from 'react';

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 8,
  className = 'border-blue-500 border-t-transparent',
}) => <div className={`w-${size} h-${size} border-2 rounded-full animate-spin ${className}`} />;
