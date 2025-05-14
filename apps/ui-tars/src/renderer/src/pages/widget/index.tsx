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

import logo from '@resources/logo-full.png?url';
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
    if (status === StatusEnum.PAUSE && isLoading) {
      setIsLoading(false);
      setIsPaused(true);
    }
  }, [status, isLoading]);

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
      className="w-100 h-100 overflow-hidden p-4 bg-white/90 dark:bg-gray-800/90 rounded-[10px] border-gray-300"
      style={{ borderWidth: isWin ? '1px' : '0' }}
    >
      <div className="flex draggable-area">
        {/* Logo */}
        <img src={logo} alt="logo" className="-ml-2 h-6 mr-auto" />
        {/* Mode Badge */}
        <div className="flex justify-center items-center text-xs border px-2 rounded-full text-gray-500">
          {getOperatorIcon(currentOperator)}
          {getOperatorLabel(currentOperator)}
        </div>
      </div>

      {!!errorMsg && <div>{errorMsg}</div>}

      {!!actions.length && !errorMsg && (
        <div className="mt-4 max-h-70 overflow-scroll hide_scroll_bar">
          {actions.map((action, idx) => {
            const ActionIcon = ActionIconMap[action.type] || MousePointerClick;
            return (
              <div key={idx}>
                {/* Actions */}
                {!!action.type && (
                  <>
                    <div className="flex items-baseline">
                      <div className="text-lg font-medium">{action.action}</div>
                      {/* {action.cost && (
                        <span className="text-xs text-gray-500 ml-2">{`(${ms(action.cost)})`}</span>
                      )} */}
                    </div>
                    <div className="flex items-center text-gray-500 text-sm">
                      {!!ActionIcon && (
                        <ActionIcon
                          className="w-4 h-4 mr-1.5"
                          strokeWidth={2}
                        />
                      )}
                      <span className="text-gray-600">{action.type}</span>
                      {action.input && (
                        <span className="text-gray-600 break-all truncate">
                          {action.input}
                        </span>
                      )}
                    </div>
                  </>
                )}
                {/* Reflection */}
                {!!action.reflection && (
                  <>
                    <div className="text-lg font-medium mt-2">Reflection</div>
                    <div className="text-gray-500 text-sm break-all">
                      {action.reflection}
                    </div>
                  </>
                )}
                {/* Thought */}
                {!!action.thought && (
                  <>
                    <div className="text-lg font-medium mt-2">Thought</div>
                    <div className="text-gray-500 text-sm break-all mb-4">
                      {action.thought}
                    </div>
                  </>
                )}
                {/* Human Query */}
                {!!action.query && (
                  <>
                    <div className="text-lg font-medium">Human Query</div>
                    <div className="text-gray-500 text-sm break-all">
                      {action.query}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
      <div className="absolute bottom-4 right-4 flex gap-2">
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
