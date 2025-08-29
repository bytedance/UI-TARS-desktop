import React, { useRef } from 'react';
import { BrowserShell } from '../BrowserShell';
import { MouseCursor } from './MouseCursor';

type ScreenshotStrategy = 'both' | 'beforeAction' | 'afterAction';

interface ScreenshotDisplayProps {
  strategy: ScreenshotStrategy;
  relatedImage: string | null;
  beforeActionImage: string | null;
  afterActionImage: string | null;
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

  // Render image with cursor or placeholder
  const renderImageContent = (
    image: string | null,
    alt: string,
    showCursor = false,
    referenceImage?: string | null,
  ) => {
    // Use reference image for consistent sizing when current image is missing
    const sizeReference = image || referenceImage;

    if (image) {
      return (
        <div className="relative">
          <img ref={imageRef} src={image} alt={alt} className="w-full h-auto object-contain" />
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

    // Show placeholder with consistent sizing
    if (sizeReference) {
      return (
        <div className="relative">
          <img src={sizeReference} alt={alt} className="w-full h-auto object-contain invisible" />
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center">
              <div className="text-gray-400 dark:text-gray-500 text-sm">
                GUI Agent Environment Not Started
              </div>
            </div>
          </div>
        </div>
      );
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
              {renderImageContent(
                beforeActionImage,
                'Browser Screenshot - Before Action',
                shouldShowMouseCursor(beforeActionImage, 'before'),
                afterActionImage,
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
              {renderImageContent(
                afterActionImage,
                'Browser Screenshot - After Action',
                false,
                beforeActionImage,
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
      {renderImageContent(
        relatedImage,
        'Browser Screenshot',
        shouldShowMouseCursor(relatedImage, 'single'),
      )}
    </BrowserShell>
  );
};
