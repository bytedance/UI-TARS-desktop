import React, { createContext, useContext, useState, ReactNode } from 'react';

interface CursorContextType {
  isHovered: boolean;
  setIsHovered: (hovered: boolean) => void;
}

const CursorContext = createContext<CursorContextType | undefined>(undefined);

export function CursorProvider({ children }: { children: ReactNode }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <CursorContext.Provider value={{ isHovered, setIsHovered }}>{children}</CursorContext.Provider>
  );
}

export function useCursor() {
  const context = useContext(CursorContext);

  // For SSR compatibility, return a default context if undefined
  if (context === undefined) {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      throw new Error('useCursor must be used within a CursorProvider');
    }
    // Return default values for SSR
    return {
      isHovered: false,
      setIsHovered: () => {}
    };
  }

  return context;
}
