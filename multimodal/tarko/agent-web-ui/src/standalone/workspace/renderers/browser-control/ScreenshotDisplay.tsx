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
  renderBrowserShell?: boolean;
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
  renderBrowserShell = true,
}) => {
  const imageRef = useRef<HTMLImageElement>(null);

  const shouldShowMouseCursor = (imageType: 'before' | 'after' | 'single') => {
    if (!mousePosition || !showCoordinates) return false;

    // Only show cursor on before action images or single images in beforeAction strategy
    return imageType === 'before' || (imageType === 'single' && strategy === 'beforeAction');
  };

  const wrapWithBrowserShell = (content: React.ReactNode, url?: string, className?: string) => {
    if (renderBrowserShell) {
      return (
        <BrowserShell url={url} className={className}>
          {content}
        </BrowserShell>
      );
    }
    return content;
  };

  // Render placeholder when no image available
  const renderPlaceholder = () => {
    const placeholderClassName = renderBrowserShell
      ? 'flex items-center justify-center bg-gray-50 dark:bg-gray-900 min-h-[400px]'
      : 'flex items-center justify-center bg-gray-50 dark:bg-gray-900 min-h-[400px] rounded-xl';

    return (
      <div className={placeholderClassName}>
        <div className="text-center">
          <div className="text-gray-400 dark:text-gray-500 text-sm">
            GUI Agent Environment Not Started
          </div>
        </div>
      </div>
    );
  };

  const renderImageContent = (
    image: string | null,
    alt: string,
    showCursor = false,
    referenceImage?: string | null,
  ) => {
    if (image) {
      const imageClassName = renderBrowserShell
        ? 'w-full h-auto object-contain'
        : 'w-full h-auto object-contain rounded-xl';

      return (
        <div className="relative">
          <img ref={imageRef} src={image} alt={alt} className={imageClassName} />
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
      const imageClassName = renderBrowserShell
        ? 'w-full h-auto object-contain invisible'
        : 'w-full h-auto object-contain invisible rounded-xl';
      const overlayClassName = renderBrowserShell
        ? 'absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900'
        : 'absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-xl';

      return (
        <div className="relative">
          <img src={referenceImage} alt={alt} className={imageClassName} />
          <div className={overlayClassName}>
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
            {wrapWithBrowserShell(
              renderImageContent(
                beforeActionImage,
                'Browser Screenshot - Before Action',
                shouldShowMouseCursor('before'),
                afterActionImage,
              ),
              beforeActionImageUrl || undefined,
            )}
          </div>
          <div>
            <div className="flex items-center justify-center mb-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                After Action
              </span>
            </div>
            {wrapWithBrowserShell(
              renderImageContent(
                afterActionImage,
                'Browser Screenshot - After Action',
                shouldShowMouseCursor('after'),
                beforeActionImage,
              ),
              afterActionImageUrl || undefined,
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show single screenshot
  return wrapWithBrowserShell(
    renderImageContent(relatedImage, 'Browser Screenshot', shouldShowMouseCursor('single')),
    relatedImageUrl || undefined,
    'mb-4',
  );
};
