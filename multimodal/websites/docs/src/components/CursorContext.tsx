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

  // Always return a safe default if context is undefined
  // This handles both SSR and cases where CursorProvider is not available
  if (context === undefined) {
    return {
      isHovered: false,
      setIsHovered: () => {}
    };
  }

  return context;
}
