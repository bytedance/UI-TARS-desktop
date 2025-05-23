import { PlusCircle } from 'lucide-react';
import { useLocation } from 'react-router';
import { useEffect, useRef, useState } from 'react';

import { Card } from '@renderer/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@renderer/components/ui/tabs';
import { Button } from '@renderer/components/ui/button';
import { SidebarTrigger } from '@renderer/components/ui/sidebar';
import { NavHeader } from '@renderer/components/Detail/NavHeader';
import { ScrollArea } from '@renderer/components/ui/scroll-area';

import { useStore } from '@renderer/hooks/useStore';
import { useSession } from '@renderer/hooks/useSession';
import Prompts from '../../components/Prompts';
import { IMAGE_PLACEHOLDER } from '@ui-tars/shared/constants';
import {
  AssistantTextMessage,
  ErrorMessage,
  HumanTextMessage,
  LoadingText,
  ScreenshotMessage,
} from '../../components/RunMessages/Messages';
import ThoughtChain from '../../components/ThoughtChain';
import { api } from '../../api';
import ImageGallery from '../../components/ImageGallery';
import { PredictionParsed } from '@ui-tars/shared/types';
import { RouterState } from '../../typings';
import ChatInput from '../../components/ChatInput';

const getFinishedContent = (predictionParsed?: PredictionParsed[]) =>
  predictionParsed?.find(
    (step) =>
      step.action_type === 'finished' &&
      typeof step.action_inputs?.content === 'string' &&
      step.action_inputs.content.trim() !== '',
  )?.action_inputs?.content as string | undefined;

const RemoteOperator = () => {
  const state = useLocation().state as RouterState;

  const { messages = [], thinking, errorMsg } = useStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const suggestions: string[] = [];
  const [selectImg, setSelectImg] = useState<number | undefined>(undefined);
  const { currentSessionId, chatMessages, setActiveSession, updateMessages } =
    useSession();
  const [activeTab, setActiveTab] = useState('vnc');

  useEffect(() => {
    if (typeof state.sessionId !== 'string') {
      return;
    }

    if (state.sessionId) {
      setActiveSession(state.sessionId);
    }
  }, [state.sessionId]);

  useEffect(() => {
    // console.log('useEffect updateMessages', currentSessionId, messages);
    if (currentSessionId && messages.length) {
      const existingMessagesSet = new Set(
        chatMessages.map(
          (msg) => `${msg.value}-${msg.from}-${msg.timing?.start}`,
        ),
      );
      const newMessages = messages.filter(
        (msg) =>
          !existingMessagesSet.has(
            `${msg.value}-${msg.from}-${msg.timing?.start}`,
          ),
      );
      const allMessages = [...chatMessages, ...newMessages];

      updateMessages(currentSessionId, allMessages);
    }
  }, [currentSessionId, chatMessages.length, messages.length]);

  useEffect(() => {
    setTimeout(() => {
      containerRef.current?.scrollIntoView(false);
    }, 100);
  }, [messages, thinking, errorMsg]);

  const handleSelect = async (suggestion: string) => {
    await api.setInstructions({ instructions: suggestion });
  };

  const handleImageSelect = async (index: number) => {
    setSelectImg(index);
    setActiveTab('screenshot');
  };

  const renderChatList = () => {
    return (
      <ScrollArea className="h-full px-4">
        <div ref={containerRef}>
          {!chatMessages?.length && suggestions?.length > 0 && (
            <Prompts suggestions={suggestions} onSelect={handleSelect} />
          )}

          {chatMessages?.map((message, idx) => {
            if (message?.from === 'human') {
              if (message?.value === IMAGE_PLACEHOLDER) {
                // screen shot
                return (
                  <ScreenshotMessage
                    key={`message-${idx}`}
                    onClick={() => handleImageSelect(idx)}
                  />
                );
              }

              return (
                <HumanTextMessage
                  key={`message-${idx}`}
                  text={message?.value}
                />
              );
            }

            const { predictionParsed, screenshotBase64WithElementMarker } =
              message;

            // Find the finished step (VL 1.5 Model)
            const finishedStep = getFinishedContent(predictionParsed);

            return (
              <div key={idx}>
                {predictionParsed?.length ? (
                  <ThoughtChain
                    steps={predictionParsed}
                    hasSomImage={!!screenshotBase64WithElementMarker}
                    onClick={() => handleImageSelect(idx)}
                  />
                ) : null}

                {!!finishedStep && <AssistantTextMessage text={finishedStep} />}
              </div>
            );
          })}

          {thinking && <LoadingText text={'Thinking...'} />}
          {errorMsg && <ErrorMessage text={errorMsg} />}
        </div>
      </ScrollArea>
    );
  };

  return (
    <div className="flex flex-col w-full h-full">
      <NavHeader title={state.operator} docUrl="https://github.com"></NavHeader>
      <div className="px-5 pb-5 flex flex-1 gap-5">
        <Card className="flex-1 basis-2/5 px-0 py-4 gap-4 h-[calc(100vh-76px)]">
          <div className="flex items-center justify-between w-full px-4">
            <SidebarTrigger
              variant="secondary"
              className="size-8"
            ></SidebarTrigger>
            <Button variant="outline" size="sm">
              <PlusCircle />
              New Chat
            </Button>
          </div>
          {renderChatList()}
          <ChatInput operator={state.operator} sessionId={state.sessionId} />
        </Card>
        <Card className="flex-1 basis-3/5 p-3 h-[calc(100vh-76px)]">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1"
          >
            <TabsList>
              <TabsTrigger value="vnc">Cloud Computer</TabsTrigger>
              <TabsTrigger value="screenshot">ScreenShot</TabsTrigger>
            </TabsList>
            {/* The `children` inside `TabsContent` are destroyed when switching
            tabs. However, if an iframe is destroyed, the WebSocket (WSS)
            reconnection fails. To prevent this issue, use CSS `hidden` to avoid
            destruction. */}
            <div className={`${activeTab === 'vnc' ? 'block' : 'hidden'}`}>
              <iframe
                className="w-full aspect-video"
                src="https://computer-use.console.volcengine.com/novnc/vnc.html?host=sd0i6blt81nuff368i6lg.apigateway-cn-beijing.volceapi.com&autoconnect=true&resize=on&show_dot=true&resize=remote&path=%2F%3Ftoken%3D7b902d73-7e4e-445b-99c0-20019b7920e9"
              ></iframe>
            </div>
            <TabsContent value="screenshot">
              <ImageGallery
                messages={chatMessages}
                selectImgIndex={selectImg}
              />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default RemoteOperator;
