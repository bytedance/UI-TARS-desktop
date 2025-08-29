import React, { useRef } from 'react';
import { BrowserShell } from '../BrowserShell';
import { MouseCursor } from './MouseCursor';

type ScreenshotStrategy = 'both' | 'beforeAction' | 'afterAction';

interface ScreenshotDisplayProps {
  strategy: ScreenshotStrategy;
  relatedImage?: string | null;
  beforeActionImage?: string | null;
  afterActionImage?: string | null;
  mousePosition?: { x: number; y: number } | null;
  previousMousePosition?: { x: number; y: number } | null;
  action?: string;
}

export const ScreenshotDisplay: React.FC<ScreenshotDisplayProps> = ({
  strategy,
  relatedImage,
  beforeActionImage,
  afterActionImage,
  mousePosition,
  previousMousePosition,
  action,
}) => {
  const imageRef = useRef<HTMLImageElement>(null);

  // Don't render if no images available
  if (!relatedImage && !(strategy === 'both' && (beforeActionImage || afterActionImage))) {
    return null;
  }

  const shouldShowMouseCursor = (
    currentImage: string | null | undefined,
    imageType: 'before' | 'after' | 'single',
  ) => {
    if (!mousePosition) return false;

    if (imageType === 'before') return true;
    if (imageType === 'after') return false;
    if (imageType === 'single') {
      return (
        strategy === 'beforeAction' || (strategy === 'both' && currentImage === beforeActionImage)
      );
    }
    return false;
  };

  if (strategy === 'both' && beforeActionImage && afterActionImage) {
    // Show both screenshots side by side
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-center mb-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Before Action
              </span>
            </div>
            <BrowserShell>
              <div className="relative">
                <img
                  ref={imageRef}
                  src={beforeActionImage}
                  alt="Browser Screenshot - Before Action"
                  className="w-full h-auto object-contain max-h-[50vh]"
                />
                {/* Mouse cursor overlay only on before action image - shows where the action will be performed */}
                {shouldShowMouseCursor(beforeActionImage, 'before') && (
                  <MouseCursor
                    position={mousePosition!}
                    previousPosition={previousMousePosition}
                    action={action}
                  />
                )}
              </div>
            </BrowserShell>
          </div>
          <div>
            <div className="flex items-center justify-center mb-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                After Action
              </span>
            </div>
            <BrowserShell>
              <div className="relative">
                <img
                  src={afterActionImage}
                  alt="Browser Screenshot - After Action"
                  className="w-full h-auto object-contain max-h-[50vh]"
                />
                {/* No cursor overlay on after action image - shows the result of the action */}
              </div>
            </BrowserShell>
          </div>
        </div>
      </div>
    );
  }

  // Show single screenshot
  return (
    <BrowserShell className="mb-4">
      <div className="relative">
        <img
          ref={imageRef}
          src={relatedImage!}
          alt="Browser Screenshot"
          className="w-full h-auto object-contain max-h-[70vh]"
        />

        {/* Enhanced mouse cursor overlay - shows action position */}
        {shouldShowMouseCursor(relatedImage, 'single') && (
          <MouseCursor
            position={mousePosition!}
            previousPosition={previousMousePosition}
            action={action}
          />
        )}
      </div>
    </BrowserShell>
  );
};
