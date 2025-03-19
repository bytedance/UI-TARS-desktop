import { useAppChat } from '@renderer/hooks/useAppChat';
import { currentEventIdAtom, eventsAtom } from '@renderer/state/chat';
import { MessageItem, MessageType } from '@renderer/type/chatMessage';
import { EventItem, EventType } from '@renderer/type/event';
import { ChatMessageUtil } from '@renderer/utils/ChatMessageUtils';
import { atom, useAtom } from 'jotai';
import { useState, useEffect, useRef } from 'react';
import { FiRotateCw, FiPause, FiPlay } from 'react-icons/fi';
import { isReportHtmlMode } from '@renderer/constants';

type ButtonState = 'replay' | 'pause' | 'continue';

interface ButtonConfig {
  icon: React.ReactElement;
  label: string;
  style: string;
}

const BUTTON_CONFIGS: Record<ButtonState, ButtonConfig> = {
  replay: {
    icon: <FiRotateCw className="w-4 h-4" />,
    label: 'Replay',
    style: 'bg-blue-500 hover:bg-blue-600 text-white',
  },
  pause: {
    icon: <FiPause className="w-4 h-4" />,
    label: 'Pause',
    style: 'bg-red-500 hover:bg-red-600 text-white',
  },
  continue: {
    icon: <FiPlay className="w-4 h-4" />,
    label: 'Continue',
    style: 'bg-blue-500 hover:bg-blue-600 text-white',
  },
};

const replayAllMessages = atom<MessageItem[]>([]);

// wait 3s to replay
const DEFAULT_COUNTDOWN = 3;

export function Replay() {
  const [allMessages, setAllMessages] = useAtom(replayAllMessages);
  const [, setEvents] = useAtom(eventsAtom);
  const [, setEventId] = useAtom(currentEventIdAtom);
  const { addMessage, updateMessage, setMessages, messageEndRef, messages } =
    useAppChat();
  const timerRef = useRef<NodeJS.Timeout>();
  const intervalRef = useRef<NodeJS.Timeout>();
  const [buttonState, setButtonState] = useState<ButtonState>('replay');
  const [countdown, setCountdown] = useState(DEFAULT_COUNTDOWN);
  const playbackRef = useRef<{
    currentIndex: number;
    eventIndex: number;
  }>({ currentIndex: 0, eventIndex: 0 });

  const clearPlayTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
  };

  const clearCountDownInterval = () => {
    setCountdown(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
  };

  useEffect(() => {
    return () => {
      clearPlayTimer();
      clearCountDownInterval();
    };
  }, []);

  useEffect(() => {
    if (isReportHtmlMode && allMessages.length) {
      intervalRef.current = setInterval(() => {
        setCountdown((prevCountdown) => {
          if (prevCountdown > 1) {
            return prevCountdown - 1;
          } else {
            clearCountDownInterval();
            handleTogglePlay();
            return 0;
          }
        });
      }, 1000);
    }
  }, [allMessages]);

  useEffect(() => {
    if (allMessages.length === 0 && messages.length !== 0) {
      setAllMessages(messages);
    }
  }, [messages.length]);

  const startPlayback = () => {
    setButtonState('pause');
    if (buttonState === 'replay') {
      setMessages([]);
      playbackRef.current = { currentIndex: 0, eventIndex: 0 };
    }

    timerRef.current = setInterval(async () => {
      const { currentIndex, eventIndex } = playbackRef.current;
      const message = allMessages[currentIndex];

      if (!message) {
        clearPlayTimer();
        setButtonState('replay');
        playbackRef.current = { currentIndex: 0, eventIndex: 0 };
        return;
      }

      if (message.type === MessageType.OmegaAgent) {
        const messageContent = message.content as { events: EventItem[] };
        const events = messageContent.events;

        if (eventIndex === 0) {
          await addMessage(
            ChatMessageUtil.assistantOmegaMessage({
              events: [],
            }),
          );
        }

        if (eventIndex >= events.length) {
          playbackRef.current.currentIndex++;
          playbackRef.current.eventIndex = 0;
        } else {
          const currentEvents = events.slice(0, eventIndex + 1);
          await updateMessage(
            {
              ...message,
              content: { events: currentEvents },
            },
            {
              shouldSyncStorage: false,
            },
          );
          messageEndRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'nearest',
          });
          playbackRef.current.eventIndex++;
          setEvents(currentEvents);
          const currentToolUseEvent = [...currentEvents]
            .reverse()
            .find((e) => e.type === EventType.ToolUsed);
          if (currentToolUseEvent) setEventId(currentToolUseEvent.id);
        }
      } else {
        await addMessage(message, {
          shouldSyncStorage: false,
        });
        playbackRef.current.currentIndex++;
      }
    }, 100);
  };

  const handleTogglePlay = () => {
    clearCountDownInterval();
    switch (buttonState) {
      case 'replay':
      case 'continue':
        startPlayback();
        break;
      case 'pause':
        clearPlayTimer();
        setButtonState('continue');
        break;
    }
  };

  const currentConfig = BUTTON_CONFIGS[buttonState];

  return (
    <div>
      <button
        onClick={handleTogglePlay}
        className={`
        flex items-center justify-center mx-auto mb-2 gap-2 px-4 py-2 text-sm font-medium rounded-lg ease-in-out
        ${currentConfig.style}
      `}
      >
        {currentConfig.icon}
        <span>{currentConfig.label}</span>
      </button>
      {isReportHtmlMode && countdown > 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center pb-2">
          start replay in <strong>{countdown}</strong> seconds
        </p>
      )}
    </div>
  );
}
