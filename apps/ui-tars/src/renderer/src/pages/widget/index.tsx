/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { useStore } from '@renderer/hooks/useStore';
import {
  Monitor,
  Globe,
  Pause,
  Play,
  Square,
  Loader,
  MousePointerClick,
} from 'lucide-react';
import { ActionIconMap } from '@renderer/const/actions';
import { useSetting } from '@renderer/hooks/useSetting';

import logo from '@resources/logo-yidao-research.png?url';
import { Button } from '@renderer/components/ui/button';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@renderer/api';

import './widget.css';
import { StatusEnum } from '@ui-tars/sdk';

// https://developer.mozilla.org/en-US/docs/Web/API/Navigator/platform
// chrome 93 support
// @ts-ignore
const isWin = navigator.userAgentData.platform === 'Windows';

interface Action {
  action: string;
  type: string;
  cost?: number;
  input?: string;
  reflection?: string;
  thought?: string;
  query?: string;
}

const getOperatorIcon = (type: string) => {
  switch (type) {
    case 'nutjs':
      return <Monitor className="h-3 w-3 mr-1.5" />;
    case 'browser':
      return <Globe className="h-3 w-3 mr-1.5" />;
    default:
      return <Monitor className="h-3 w-3 mr-1.5" />;
  }
};

const getOperatorLabel = (type: string) => {
  switch (type) {
    case 'nutjs':
      return 'Computer';
    case 'browser':
      return 'Browser';
    default:
      return 'Computer';
  }
};

const Widget = () => {
  const { messages = [], errorMsg, status } = useStore();
  const { settings } = useSetting();

  const currentOperator = settings.operator || 'nutjs';

  const [actions, setActions] = useState<Action[]>([]);
  const [buttonAreaRef, setButtonAreaRef] = useState<HTMLDivElement | null>(
    null,
  );

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];

    console.log('lastMessage', lastMessage);

    if (!lastMessage) {
      return;
    }

    if (lastMessage.from === 'human') {
      if (!lastMessage.screenshotBase64) {
        setActions([
          {
            action: '',
            type: '',
            query: lastMessage.value,
          },
        ]);
        return;
      } else {
        return;
      }
    }

    const ac =
      lastMessage.predictionParsed?.map((item) => {
        const input = [
          item.action_inputs?.start_box &&
            `(start_box: ${item.action_inputs.start_box})`,
          item.action_inputs?.content && `(${item.action_inputs.content})`,
          item.action_inputs?.key && `(${item.action_inputs.key})`,
        ]
          .filter(Boolean)
          .join(' ');

        return {
          action: 'Action',
          type: item.action_type,
          cost: lastMessage.timing?.cost,
          input: input || undefined,
          reflection: item.reflection || '',
          thought: item.thought,
        };
      }) || [];

    setActions(ac);
  }, [messages.length]);

  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // 响应全局状态变化，同步更新本地状态
    if (status === StatusEnum.PAUSE) {
      setIsLoading(false);
      setIsPaused(true);
    } else if (status === StatusEnum.RUNNING && isPaused) {
      setIsPaused(false);
    }
  }, [status, isPaused]);

  // 鼠标穿透控制
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!buttonAreaRef) return;

      const rect = buttonAreaRef.getBoundingClientRect();
      const isInButtonArea =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      // 当鼠标在按钮区域时禁用穿透，否则启用穿透
      api.setWidgetMouseIgnore({ ignore: !isInButtonArea });
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [buttonAreaRef]);

  const handlePlayPauseClick = useCallback(async () => {
    if (isLoading) return;

    if (isPaused) {
      await api.resumeRun();
      setIsPaused(false);
    } else {
      await api.pauseRun();
      setIsLoading(true);
    }
  }, [isPaused]);

  const handleStop = useCallback(async () => {
    await api.stopRun();
    await api.clearHistory();
  }, []);

  return (
    <div
      className="w-100 h-70 overflow-hidden p-4 bg-white/90 dark:bg-gray-800/90 rounded-[10px] border-gray-300 fixed bottom-0 left-0 right-0 pointer-events-none select-none flex flex-col"
      style={{ borderWidth: isWin ? '1px' : '0', opacity: 0.95 }}
    >
      <div className="flex draggable-area pointer-events-none">
        {/* Logo */}
        <img
          src={logo}
          alt="logo"
          className="-ml-2 h-6 mr-auto pointer-events-none"
        />
        {/* Mode Badge */}
        <div className="flex justify-center items-center text-xs border px-2 rounded-full text-gray-500 pointer-events-none">
          {getOperatorIcon(currentOperator)}
          {getOperatorLabel(currentOperator)}
        </div>
      </div>

      {!!errorMsg && <div className="pointer-events-none">{errorMsg}</div>}

      {/* 显示人工介入提示 */}
      {isPaused && (
        <div className="flex-1 flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-2 text-black dark:text-white text-xl font-bold">
            <MousePointerClick className="h-5 w-5" />
            <span>请接管电脑，手动完成操作</span>
          </div>
        </div>
      )}

      {/* 正常显示Action和Thought */}
      {!isPaused && !!actions.length && !errorMsg && (
        <div className="mt-4 max-h-70 overflow-scroll hide_scroll_bar pointer-events-none">
          {actions.map((action, idx) => {
            const ActionIcon = ActionIconMap[action.type] || MousePointerClick;
            return (
              <div key={idx} className="pointer-events-none">
                {/* Actions */}
                {!!action.type && (
                  <>
                    <div className="flex items-baseline pointer-events-none">
                      <div className="text-lg font-medium pointer-events-none">
                        {action.action}
                      </div>
                      {/* {action.cost && (
                        <span className="text-xs text-gray-500 ml-2">{`(${ms(action.cost)})`}</span>
                      )} */}
                    </div>
                    <div className="flex items-center text-gray-500 text-sm pointer-events-none">
                      {!!ActionIcon && (
                        <ActionIcon
                          className="w-4 h-4 mr-1.5 pointer-events-none"
                          strokeWidth={2}
                        />
                      )}
                      <span className="text-gray-600 pointer-events-none">
                        {action.type}
                      </span>
                      {action.input && (
                        <span className="text-gray-600 break-all truncate pointer-events-none">
                          {action.input}
                        </span>
                      )}
                    </div>
                  </>
                )}
                {/* Reflection */}
                {!!action.reflection && (
                  <>
                    <div className="text-lg font-medium mt-2 pointer-events-none">
                      Reflection
                    </div>
                    <div className="text-gray-500 text-sm break-all pointer-events-none">
                      {action.reflection}
                    </div>
                  </>
                )}
                {/* Thought */}
                {!!action.thought && (
                  <>
                    <div className="text-lg font-medium mt-2 pointer-events-none">
                      Thought
                    </div>
                    <div className="text-gray-500 text-sm break-all mb-4 pointer-events-none">
                      {action.thought}
                    </div>
                  </>
                )}
                {/* Human Query */}
                {!!action.query && (
                  <>
                    <div className="text-lg font-medium pointer-events-none">
                      Human Query
                    </div>
                    <div className="text-gray-500 text-sm break-all pointer-events-none">
                      {action.query}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
      <div
        ref={setButtonAreaRef}
        className="absolute bottom-4 right-4 flex gap-2 pointer-events-auto"
      >
        <Button
          variant="outline"
          size="icon"
          onClick={handlePlayPauseClick}
          className="h-8 w-8 border-gray-400 hover:border-gray-500 bg-white/50 hover:bg-white/60"
        >
          {isLoading ? (
            <Loader className="h-4 w-4 loader-icon" />
          ) : isPaused ? (
            <Play className="h-4 w-4" />
          ) : (
            <Pause className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleStop}
          className="h-8 w-8 text-red-400 border-red-400 bg-white/50 hover:bg-red-50/80 hover:text-red-500"
        >
          <Square className="h-4 w-4 text-red-500" />
        </Button>
      </div>
    </div>
  );
};

export default Widget;
