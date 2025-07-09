export interface FullscreenAPI {
  requestFullscreen: (element: Element) => Promise<void>;
  exitFullscreen: () => Promise<void>;
  fullscreenElement: Element | null;
  fullscreenEnabled: boolean;
  addEventListener: (type: string, listener: EventListener) => void;
  removeEventListener: (type: string, listener: EventListener) => void;
}

/**
 * Get standardized fullscreen API
 */
export function getFullscreenAPI(): FullscreenAPI | null {
  if (typeof document === 'undefined') return null;

  if (document.fullscreenEnabled) {
    return {
      requestFullscreen: (element: Element) => element.requestFullscreen(),
      exitFullscreen: () => document.exitFullscreen(),
      get fullscreenElement() { return document.fullscreenElement; },
      get fullscreenEnabled() { return document.fullscreenEnabled; },
      addEventListener: (type: string, listener: EventListener) => 
        document.addEventListener('fullscreenchange', listener),
      removeEventListener: (type: string, listener: EventListener) => 
        document.removeEventListener('fullscreenchange', listener),
    };
  }

  const webkitDoc = document as any;
  if (webkitDoc.webkitFullscreenEnabled) {
    return {
      requestFullscreen: (element: Element) => (element as any).webkitRequestFullscreen(),
      exitFullscreen: () => webkitDoc.webkitExitFullscreen(),
      get fullscreenElement() { return webkitDoc.webkitFullscreenElement; },
      get fullscreenEnabled() { return webkitDoc.webkitFullscreenEnabled; },
      addEventListener: (type: string, listener: EventListener) => 
        document.addEventListener('webkitfullscreenchange', listener),
      removeEventListener: (type: string, listener: EventListener) => 
        document.removeEventListener('webkitfullscreenchange', listener),
    };
  }

  const mozDoc = document as any;
  if (mozDoc.mozFullScreenEnabled) {
    return {
      requestFullscreen: (element: Element) => (element as any).mozRequestFullScreen(),
      exitFullscreen: () => mozDoc.mozCancelFullScreen(),
      get fullscreenElement() { return mozDoc.mozFullScreenElement; },
      get fullscreenEnabled() { return mozDoc.mozFullScreenEnabled; },
      addEventListener: (type: string, listener: EventListener) => 
        document.addEventListener('mozfullscreenchange', listener),
      removeEventListener: (type: string, listener: EventListener) => 
        document.removeEventListener('mozfullscreenchange', listener),
    };
  }

  const msDoc = document as any;
  if (msDoc.msFullscreenEnabled) {
    return {
      requestFullscreen: (element: Element) => (element as any).msRequestFullscreen(),
      exitFullscreen: () => msDoc.msExitFullscreen(),
      get fullscreenElement() { return msDoc.msFullscreenElement; },
      get fullscreenEnabled() { return msDoc.msFullscreenEnabled; },
      addEventListener: (type: string, listener: EventListener) => 
        document.addEventListener('MSFullscreenChange', listener),
      removeEventListener: (type: string, listener: EventListener) => 
        document.removeEventListener('MSFullscreenChange', listener),
    };
  }

  return null;
}

/**
 * Toggle fullscreen state
 */
export async function toggleFullscreen(element?: Element): Promise<boolean> {
  const api = getFullscreenAPI();
  if (!api) {
    console.warn('Fullscreen API is not supported');
    return false;
  }

  try {
    if (api.fullscreenElement) {
      await api.exitFullscreen();
      return false;
    } else {
      const targetElement = element || document.documentElement;
      await api.requestFullscreen(targetElement);
      return true;
    }
  } catch (error) {
    console.error('Failed to toggle fullscreen:', error);
    return false;
  }
}

/**
 * Check if currently in fullscreen mode
 */
export function isFullscreen(): boolean {
  const api = getFullscreenAPI();
  return api ? !!api.fullscreenElement : false;
}

/**
 * Listen to fullscreen state changes
 */
export function onFullscreenChange(callback: (isFullscreen: boolean) => void): () => void {
  const api = getFullscreenAPI();
  if (!api) return () => {};

  const handleChange = () => {
    callback(!!api.fullscreenElement);
  };

  api.addEventListener('fullscreenchange', handleChange);

  return () => {
    api.removeEventListener('fullscreenchange', handleChange);
  };
}
