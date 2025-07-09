/**
 * 全屏工具函数
 */

export interface FullscreenAPI {
  requestFullscreen: (element: Element) => Promise<void>;
  exitFullscreen: () => Promise<void>;
  fullscreenElement: Element | null;
  fullscreenEnabled: boolean;
  addEventListener: (type: string, listener: EventListener) => void;
  removeEventListener: (type: string, listener: EventListener) => void;
}

/**
 * 获取标准化的全屏 API
 */
export function getFullscreenAPI(): FullscreenAPI | null {
  if (typeof document === 'undefined') return null;

  // 标准 API
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

  // Webkit 前缀 (Safari)
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

  // Mozilla 前缀 (旧版 Firefox)
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

  // MS 前缀 (IE/Edge)
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
 * 切换全屏状态
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
 * 检查是否处于全屏状态
 */
export function isFullscreen(): boolean {
  const api = getFullscreenAPI();
  return api ? !!api.fullscreenElement : false;
}

/**
 * 监听全屏状态变化
 */
export function onFullscreenChange(callback: (isFullscreen: boolean) => void): () => void {
  const api = getFullscreenAPI();
  if (!api) return () => {};

  const handleChange = () => {
    callback(!!api.fullscreenElement);
  };

  api.addEventListener('fullscreenchange', handleChange);

  // 返回清理函数
  return () => {
    api.removeEventListener('fullscreenchange', handleChange);
  };
}
