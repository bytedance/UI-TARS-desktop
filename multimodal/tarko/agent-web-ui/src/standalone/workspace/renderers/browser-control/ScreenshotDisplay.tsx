import React, { useRef } from 'react';
import { BrowserShell } from '../BrowserShell';
import { MouseCursor } from './MouseCursor';

type ScreenshotStrategy = 'both' | 'beforeAction' | 'afterAction';

interface ScreenshotDisplayProps {
  strategy: ScreenshotStrategy;
  relatedImage: string | null;
  beforeActionImage: string | null;
  afterActionImage: string | null;
  relatedImageUrl?: string | null;
  beforeActionImageUrl?: string | null;
  afterActionImageUrl?: string | null;
  mousePosition?: { x: number; y: number } | null;
  previousMousePosition?: { x: number; y: number } | null;
  action?: string;
  showCoordinates?: boolean;
}

export const ScreenshotDisplay: React.FC<ScreenshotDisplayProps> = ({
  strategy,
  relatedImage,
  beforeActionImage,
  afterActionImage,
  relatedImageUrl,
  beforeActionImageUrl,
  afterActionImageUrl,
  mousePosition,
  previousMousePosition,
  action,
  showCoordinates = true,
}) => {
  const imageRef = useRef<HTMLImageElement>(null);

  const shouldShowMouseCursor = (imageType: 'before' | 'after' | 'single') => {
    if (!mousePosition || !showCoordinates) return false;

    // Only show cursor on before action images or single images in beforeAction strategy
    return imageType === 'before' || (imageType === 'single' && strategy === 'beforeAction');
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

  const renderImageContent = (
    image: string | null,
    alt: string,
    showCursor = false,
    referenceImage?: string | null,
  ) => {
    if (image) {
      return (
        <div className="relative">
          <img ref={imageRef} src={image} alt={alt} className="w-full h-auto object-contain" />
          {showCursor && mousePosition && (
            <MouseCursor
              position={mousePosition}
              previousPosition={previousMousePosition}
              action={action}
            />
          )}
        </div>
      );
    }

    // Show placeholder with consistent sizing using reference image
    if (referenceImage) {
      return (
        <div className="relative">
          <img src={referenceImage} alt={alt} className="w-full h-auto object-contain invisible" />
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
            <BrowserShell url={beforeActionImageUrl || undefined}>
              {renderImageContent(
                beforeActionImage,
                'Browser Screenshot - Before Action',
                shouldShowMouseCursor('before'),
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
            <BrowserShell url={afterActionImageUrl || undefined}>
              {renderImageContent(
                afterActionImage,
                'Browser Screenshot - After Action',
                shouldShowMouseCursor('after'),
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
    <BrowserShell className="mb-4" url={relatedImageUrl || undefined}>
      {renderImageContent(relatedImage, 'Browser Screenshot', shouldShowMouseCursor('single'))}
    </BrowserShell>
  );
};
