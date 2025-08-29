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

  // Render placeholder when no image available
  const renderPlaceholder = () => (
    <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-900 min-h-[400px]">
      <div className="text-center">
        <div className="text-gray-400 dark:text-gray-500 text-sm">
          GUI Agent Environment Not Started
        </div>
      </div>
    </div>
  );

  // Render hidden image with overlay placeholder
  const renderHiddenImageWithOverlay = (imageSrc: string, alt: string) => (
    <div className="relative">
      <img src={imageSrc} alt={alt} className="w-full h-auto object-contain invisible" />
      <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-gray-400 dark:text-gray-500 text-sm">
            GUI Agent Environment Not Started
          </div>
        </div>
      </div>
    </div>
  );

  // Render image or placeholder
  const renderImageOrPlaceholder = (
    image: string | null,
    alt: string,
    showCursor = false,
    isInBothMode = false,
  ) => {
    if (image) {
      return (
        <div className="relative">
          <img
            ref={imageRef}
            src={image}
            alt={alt}
            className={`w-full h-auto object-contain ${!isInBothMode ? 'max-h-[70vh]' : ''}`}
          />
          {showCursor && (
            <MouseCursor
              position={mousePosition!}
              previousPosition={previousMousePosition}
              action={action}
            />
          )}
        </div>
      );
    }

    // For both mode, use the other image as layout base
    if (isInBothMode) {
      const otherImage = alt.includes('Before') ? afterActionImage : beforeActionImage;
      if (otherImage) {
        return renderHiddenImageWithOverlay(otherImage, alt);
      }
    }

    return renderPlaceholder();
  };

  if (strategy === 'both') {
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
              {renderImageOrPlaceholder(
                beforeActionImage,
                'Browser Screenshot - Before Action',
                shouldShowMouseCursor(beforeActionImage, 'before'),
                true,
              )}
            </BrowserShell>
          </div>
          <div>
            <div className="flex items-center justify-center mb-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                After Action
              </span>
            </div>
            <BrowserShell>
              {renderImageOrPlaceholder(
                afterActionImage,
                'Browser Screenshot - After Action',
                false,
                true,
              )}
            </BrowserShell>
          </div>
        </div>
      </div>
    );
  }

  // Show single screenshot
  return (
    <BrowserShell className="mb-4">
      {renderImageOrPlaceholder(
        relatedImage,
        'Browser Screenshot',
        shouldShowMouseCursor(relatedImage, 'single'),
      )}
    </BrowserShell>
  );
};
