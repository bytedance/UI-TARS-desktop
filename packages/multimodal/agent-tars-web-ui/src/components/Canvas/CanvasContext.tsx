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

  // 增加自动显示逻辑
  const handleSetActiveBlock = (id: string | null) => {
    setActiveBlock(id);
    // 当选择一个区块时，自动显示Canvas
    if (id) {
      setCanvasVisible(true);
    }
  };

  return (
    <CanvasContext.Provider
      value={{
        activeBlock,
        setActiveBlock: handleSetActiveBlock,
        isCanvasVisible,
        setCanvasVisible,
      }}
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
