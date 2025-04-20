/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useMemo, useRef } from 'react';

import { IMAGE_PLACEHOLDER } from '@ui-tars/shared/constants';
import { StatusEnum } from '@ui-tars/shared/types';

import { useRunAgent } from '@renderer/hooks/useRunAgent';
import { useStore } from '@renderer/hooks/useStore';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@renderer/components/ui/tooltip';
import { Button } from '@renderer/components/ui/button';
// import { useScreenRecord } from '@renderer/hooks/useScreenRecord';
import { api } from '@renderer/api';

import { Play, Send, Square, Loader2 } from 'lucide-react';
import { Textarea } from '@renderer/components/ui/textarea';
import { useSession } from '@renderer/hooks/useSession';

import { SelectOperator } from './SelectOperator';
import { sleep } from '@ui-tars/shared/utils';

const ChatInput = () => {
  const {
    status,
    instructions: savedInstructions,
    messages,
    restUserData,
  } = useStore();
  const [localInstructions, setLocalInstructions] = React.useState('');
  const { run } = useRunAgent();

  const getInstantInstructions = () => {
    if (localInstructions?.trim()) {
      return localInstructions;
    }
    if (isCallUser && savedInstructions?.trim()) {
      return savedInstructions;
    }
    return '';
  };

  // const { startRecording, stopRecording, recordRefs } = useScreenRecord();

  const { currentSessionId, updateSession, createSession } = useSession();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const running = status === StatusEnum.RUNNING;

  // console.log('running', 'status', status, running);

  const startRun = async () => {
    // startRecording().catch((e) => {
    //   console.error('start recording failed:', e);
    // });
    const instructions = getInstantInstructions();

    console.log('startRun', instructions, restUserData);

    if (!currentSessionId) {
      await createSession(instructions, restUserData || {});
      await sleep(100);
    } else {
      await updateSession(currentSessionId, { name: instructions });
    }

    run(instructions, () => {
      setLocalInstructions('');
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) {
      return;
    }

    // `enter` to submit
    if (
      e.key === 'Enter' &&
      !e.shiftKey &&
      !e.metaKey &&
      getInstantInstructions()
    ) {
      e.preventDefault();

      startRun();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (status === StatusEnum.INIT) {
      return;
    }
  }, [status]);

  const isCallUser = useMemo(() => status === StatusEnum.CALL_USER, [status]);

  // console.log('status', status);

  /**
   * `call_user` for human-in-the-loop
   */
  // useEffect(() => {
  //   // if (status === StatusEnum.CALL_USER && savedInstructions) {
  //   //   setLocalInstructions(savedInstructions);
  //   // }
  //   // record screen when running
  //   if (status !== StatusEnum.INIT) {
  //     stopRecording();
  //   }

  //   return () => {
  //     stopRecording();
  //   };
  // }, [status]);

  const lastHumanMessage =
    [...(messages || [])]
      .reverse()
      .find((m) => m?.from === 'human' && m?.value !== IMAGE_PLACEHOLDER)
      ?.value || '';

  const stopRun = async () => {
    await api.stopRun();
    await api.clearHistory();
  };

  const renderButton = () => {
    if (running) {
      return (
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8"
          onClick={stopRun}
        >
          <Square className="h-4 w-4" />
        </Button>
      );
    }

    if (isCallUser && !localInstructions) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 bg-pink-100 hover:bg-pink-200 text-pink-500 border-pink-200"
                onClick={startRun}
                disabled={!getInstantInstructions()}
              >
                <Play className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="whitespace-pre-line">
                send last instructions when you done for ui-tars&apos;s
                &apos;CALL_USER&apos;
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <Button
        variant="secondary"
        size="icon"
        className="h-8 w-8"
        onClick={startRun}
        disabled={!getInstantInstructions()}
      >
        <Send className="h-4 w-4" />
      </Button>
    );
  };

  return (
    <div className="p-4 w-full">
      <div className="flex flex-col space-y-4">
        <div className="relative w-full">
          <Textarea
            ref={textareaRef}
            placeholder={
              isCallUser && savedInstructions
                ? `${savedInstructions}`
                : running && lastHumanMessage && messages?.length > 1
                  ? lastHumanMessage
                  : 'What can I do for you today?'
            }
            className="min-h-[120px] rounded-2xl resize-none px-4 pb-16" // 调整内边距
            value={localInstructions}
            disabled={running}
            onChange={(e) => setLocalInstructions(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {!localInstructions && !running && (
            <span className="absolute right-4 top-4 text-xs text-muted-foreground pointer-events-none">
              `Enter` to run
            </span>
          )}
          <SelectOperator />
          <div className="absolute right-4 bottom-4 flex items-center gap-2">
            {running && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            {renderButton()}
          </div>
        </div>
      </div>

      {/* <div style={{ display: 'none' }}>
        <video ref={recordRefs.videoRef} />
        <canvas ref={recordRefs.canvasRef} />
      </div> */}
    </div>
  );
};

export default ChatInput;
