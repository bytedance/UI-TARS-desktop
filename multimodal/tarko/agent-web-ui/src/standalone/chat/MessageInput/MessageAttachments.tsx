import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { ChatCompletionContentPart } from '@tarko/agent-interface';
import { useSetAtom } from 'jotai';
import { ImagePreview } from '../ImagePreview';
import { ContextualTags } from '../ContextualTags';
import { ContextualItem } from '../ContextualSelector';
import { removeContextualItemAction } from '@/common/state/atoms/contextualSelector';
import { isContextualSelectorEnabled } from '@/config/web-ui-config';

interface MessageAttachmentsProps {
  images: ChatCompletionContentPart[];
  contextualItems: ContextualItem[];
  onRemoveImage: (index: number) => void;
}

/**
 * MessageAttachments - Displays image previews and contextual tags with jotai integration
 *
 * Manages the display of all attachments (images and contextual file references)
 */
export const MessageAttachments: React.FC<MessageAttachmentsProps> = ({
  images,
  contextualItems,
  onRemoveImage,
}) => {
  const removeContextualItem = useSetAtom(removeContextualItemAction);

  // Check if contextual selector is enabled
  const contextualSelectorEnabled = isContextualSelectorEnabled();

  const hasAttachments =
    images.length > 0 || (contextualSelectorEnabled && contextualItems.length > 0);

  if (!hasAttachments) {
    return null;
  }

  return (
    <>
      {/* Contextual tags */}
      {contextualSelectorEnabled && contextualItems.length > 0 && (
        <ContextualTags items={contextualItems} onRemove={removeContextualItem} />
      )}

      {/* Image previews */}
      {images.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          <AnimatePresence>
            {images.map((image, index) => (
              <ImagePreview key={index} image={image} onRemove={() => onRemoveImage(index)} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </>
  );
};
