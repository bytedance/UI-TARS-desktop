/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useMemo, useEffect } from 'react';
import { MousePointerClick, SkipBack, SkipForward } from 'lucide-react';
import { Button } from '@renderer/components/ui/button';
import { Slider } from '@renderer/components/ui/slider';
import { type ConversationWithSoM } from '@main/shared/types';
import { ActionIconMap } from '@renderer/const/actions';
import ms from 'ms';

import { SnapshotImage } from './image';

interface ImageGalleryProps {
  selectImgIndex?: number;
  messages: ConversationWithSoM[];
}

interface Action {
  type: string;
  action: string;
  cost?: number;
  input?: string;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({
  messages,
  selectImgIndex,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const imageEntries = useMemo(() => {
    return messages
      .map((msg, index) => {
        let actions: Action[] = [];

        if (msg.from === 'human') {
          actions = [
            {
              action: 'Screenshot',
              type: 'screenshot',
              cost: msg.timing?.cost,
            },
          ];
        } else {
          actions =
            msg.predictionParsed?.map((item) => {
              let input = '';

              if (item.action_inputs?.start_box) {
                input += `(start_box: ${item.action_inputs.start_box})`;
              }
              if (item.action_inputs?.content) {
                input += ` (${item.action_inputs.content})`;
              }
              if (item.action_inputs?.key) {
                input += ` (${item.action_inputs.key})`;
              }

              return {
                action: 'Action',
                type: item.action_type,
                cost: msg.timing?.cost,
                input,
              };
            }) || [];
        }
        return {
          originalIndex: index,
          message: msg,
          imageData:
            msg.screenshotBase64 || msg.screenshotBase64WithElementMarker,
          actions: actions,
          timing: msg.timing,
        };
      })
      .filter((entry) => entry.imageData);
  }, [messages]);

  useEffect(() => {
    if (typeof selectImgIndex === 'number') {
      const targetIndex = imageEntries.findIndex(
        (entry) => entry.originalIndex === selectImgIndex,
      );
      if (targetIndex !== -1) {
        setCurrentIndex(targetIndex);
      }
    }
    // console.log('selectImgIndex', selectImgIndex);
  }, [selectImgIndex, imageEntries]);

  useEffect(() => {
    setCurrentIndex(imageEntries.length - 1);
  }, [imageEntries]);

  const handleSliderChange = (value: number[]) => {
    setCurrentIndex(value[0]);
  };

  const handlePrevious = () => {
    setCurrentIndex(
      (current) => (current - 1 + imageEntries.length) % imageEntries.length,
    );
  };

  const handleNext = () => {
    setCurrentIndex((current) => (current + 1) % imageEntries.length);
  };

  if (imageEntries.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No images to display
      </div>
    );
  }

  const currentEntry = imageEntries[currentIndex];
  const mime = currentEntry?.message?.screenshotContext?.mime || 'image/png';

  if (!currentEntry) {
    return null;
  }

  const renderActions = () => {
    return (
      <>
        {currentEntry.actions.map((action, idx) => {
          const ActionIcon = ActionIconMap[action.type] || MousePointerClick;

          if (!action.type) {
            return null;
          }

          return (
            <div
              key={idx}
              className="flex items-start gap-2 min-w-fit flex-shrink-0"
            >
              <div className="text-muted-foreground">
                <ActionIcon className="w-9 h-9" />
              </div>
              <div className="flex-1">
                <div className="text-base font-medium leading-tight">
                  {action.action}
                </div>
                <div className="text-xs text-muted-foreground max-w-full mr-4">
                  <span className="font-medium text-primary/70">
                    {action.type}
                  </span>
                  {action.input && (
                    <span className="text-primary/70 break-all max-w-full">
                      {action.input}
                    </span>
                  )}
                  {action.cost && (
                    <span className="ml-1 text-muted-foreground/70">
                      {ms(action.cost)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </>
    );
  };

  const renderSlider = () => {
    return (
      <>
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrevious}
          disabled={imageEntries.length <= 1 || currentIndex === 0}
        >
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNext}
          disabled={
            imageEntries.length <= 1 || currentIndex === imageEntries.length - 1
          }
        >
          <SkipForward className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <Slider
            value={[currentIndex]}
            min={0}
            max={imageEntries.length - 1}
            step={1}
            onValueChange={handleSliderChange}
            disabled={imageEntries.length <= 1}
          />
        </div>
      </>
    );
  };

  return (
    <div className="h-full flex flex-col py-4">
      <div className="flex overflow-x-scroll gap-2">{renderActions()}</div>

      <SnapshotImage
        src={`data:${mime};base64,${currentEntry.imageData}`}
        alt={`screenshot from message ${currentEntry.originalIndex + 1}`}
      />

      <div className="flex items-center mt-4">{renderSlider()}</div>
    </div>
  );
};

export default ImageGallery;
