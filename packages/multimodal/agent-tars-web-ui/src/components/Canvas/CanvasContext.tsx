import React, { createContext, useContext, useState } from 'react';

/**
 * Context for managing Canvas state across components
 */
interface CanvasContextType {
  /**
   * ID of currently active block, null if no block is selected
   */
  activeBlock: string | null;

  /**
   * Updates the active block with given ID or clears selection when null
   */
  setActiveBlock: (id: string | null) => void;

  /**
   * Controls visibility of the canvas panel
   */
  isCanvasVisible: boolean;

  /**
   * Shows or hides the canvas panel
   */
  setCanvasVisible: (visible: boolean) => void;
}

const CanvasContext = createContext<CanvasContextType | undefined>(undefined);

/**
 * Provider for Canvas context
 */
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

/**
 * Hook for accessing Canvas context
 * @returns Canvas context state and methods
 */
export const useCanvas = (): CanvasContextType => {
  const context = useContext(CanvasContext);
  if (!context) {
    throw new Error('useCanvas must be used within a CanvasProvider');
  }
  return context;
};
