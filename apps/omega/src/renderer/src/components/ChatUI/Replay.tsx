import { useAppChat } from '@renderer/hooks/useAppChat';
import { currentEventIdAtom, eventsAtom } from '@renderer/state/chat';
import { MessageItem, MessageType } from '@renderer/type/chatMessage';
import { EventItem, EventType } from '@renderer/type/event';
import { ChatMessageUtil } from '@renderer/utils/ChatMessageUtils';
import { useAtom } from 'jotai';
import { useState, useEffect, useRef } from 'react';
import { FiPlay, FiSquare } from 'react-icons/fi';

export function Replay() {
  const [, setEvents] = useAtom(eventsAtom);
  const [, setEventId] = useAtom(currentEventIdAtom);
  const { addMessage, updateMessage, setMessages, messageEndRef, messages } =
    useAppChat();
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef<NodeJS.Timeout>();

  const clearPlayTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
  };

  useEffect(() => {
    return () => clearPlayTimer();
  }, []);

  const handleTogglePlay = () => {
    setIsPlaying((prev) => !prev);
    if (!isPlaying) {
      let totalMessages: MessageItem[] = [...messages];
      setMessages((messages) => {
        totalMessages = [...messages];
        return [];
      });
      console.log('totalMessages', totalMessages);
      let currentIndex = 0;
      let eventIndex = 0;

      timerRef.current = setInterval(async () => {
        const message = totalMessages[currentIndex];

        if (!message) {
          clearPlayTimer();
          setIsPlaying(false);
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
            currentIndex++;
            eventIndex = 0;
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
            eventIndex++;
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
          currentIndex++;
        }
      }, 100);
    } else {
      clearPlayTimer();
      setMessages(messages);
    }
  };

  return (
    <button
      onClick={handleTogglePlay}
      className={`
        flex items-center justify-center mx-auto mb-2 gap-2 px-4 py-2 text-sm font-medium rounded-lg
         ease-in-out
        ${
          isPlaying
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'bg-blue-500 hover:bg-blue-600 text-white'
        }
      `}
      style={{
        width: '100px',
      }}
      title={isPlaying ? 'Stop' : 'Play'}
    >
      {isPlaying ? (
        <FiSquare className="w-4 h-4" />
      ) : (
        <FiPlay className="w-4 h-4" />
      )}
      <span>{isPlaying ? 'Stop' : 'Replay'}</span>
    </button>
  );
}
