import React, { createContext, useContext, useState } from 'react';

interface CanvasContextType {
  activeBlock: string | null;
  setActiveBlock: (id: string | null) => void;
  isCanvasVisible: boolean;
  setCanvasVisible: (visible: boolean) => void;
}

const CanvasContext = createContext<CanvasContextType | undefined>(undefined);

export const CanvasProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeBlock, setActiveBlock] = useState<string | null>(null);
  const [isCanvasVisible, setCanvasVisible] = useState<boolean>(false);

  return (
    <CanvasContext.Provider
      value={{ activeBlock, setActiveBlock, isCanvasVisible, setCanvasVisible }}
    >
      {children}
    </CanvasContext.Provider>
  );
};

export const useCanvas = () => {
  const context = useContext(CanvasContext);
  if (!context) {
    throw new Error('useCanvas must be used within a CanvasProvider');
  }
  return context;
};
