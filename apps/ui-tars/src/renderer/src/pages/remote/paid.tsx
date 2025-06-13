import { MessageCirclePlus } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { useCallback, useEffect, useRef, useState } from 'react';

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
import ImageGallery from '../../components/ImageGallery';
import { RouterState } from '../../typings';
import ChatInput from '../../components/ChatInput';
import { TerminateDialog } from '../../components/AlertDialog/terminateDialog';

import { PredictionParsed, StatusEnum } from '@ui-tars/shared/types';
import { Operator } from '@main/store/types';
import { api } from '../../api';
import { useRemoteResource } from '../../hooks/useRemoteResource';
import { VNCPreview } from './cast/vnc';
import { CDPBrowser } from './cast/canvas';
import { NavDialog } from '../../components/AlertDialog/navDialog';

const getFinishedContent = (predictionParsed?: PredictionParsed[]) =>
  predictionParsed?.find(
    (step) =>
      step.action_type === 'finished' &&
      typeof step.action_inputs?.content === 'string' &&
      step.action_inputs.content.trim() !== '',
  )?.action_inputs?.content as string | undefined;

const RemoteOperator = () => {
  const state = useLocation().state as RouterState;
  const navigate = useNavigate();

  const { status: agentStatus, messages = [], thinking, errorMsg } = useStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const suggestions: string[] = [];
  const [selectImg, setSelectImg] = useState<number | undefined>(undefined);
  const [initId, setInitId] = useState('');
  const {
    currentSessionId,
    chatMessages,
    setActiveSession,
    updateMessages,
    createSession,
  } = useSession();
  const [activeTab, setActiveTab] = useState('vnc');
  const { status, queueNum, rdpUrl, releaseResource } = useRemoteResource({
    sessionId: state.sessionId,
    operator: state.operator,
    isFree: state.isFree ?? true,
    from: state.from,
  });
  const TabName =
    state.operator === Operator.RemoteComputer
      ? 'Cloud Computer'
      : 'Cloud Browser';
  const [disabled, setDisabled] = useState(true);
  const [pendingAction, setPendingAction] = useState<'newChat' | 'back' | null>(
    null,
  );
  const [isNavDialogOpen, setNavDialogOpen] = useState(false);

  const [isTerminateDialogOpen, setTerminateDialogOpen] = useState(false);

  const onTerminateOpenChange = useCallback((status: boolean) => {
    setTerminateDialogOpen(status);
  }, []);

  useEffect(() => {
    if (status === 'connected') {
      setDisabled(false);
    } else {
      setDisabled(true);
    }
    if (status === 'unavailable') {
      setActiveTab('screenshot');
    }
  }, [status]);

  useEffect(() => {
    const update = async () => {
      if (state.sessionId) {
        await setActiveSession(state.sessionId);
        setInitId(state.sessionId);
      }
    };
    update();

    return () => {
      releaseResource();
    };
  }, [state.sessionId]);

  useEffect(() => {
    if (initId !== state.sessionId) {
      return;
    }

    if (
      state.sessionId &&
      currentSessionId &&
      state.sessionId !== currentSessionId
    ) {
      return;
    }

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
  }, [
    initId,
    state.sessionId,
    currentSessionId,
    chatMessages.length,
    messages.length,
  ]);

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

  const needsConfirm =
    agentStatus === StatusEnum.RUNNING ||
    agentStatus === StatusEnum.CALL_USER ||
    agentStatus === StatusEnum.PAUSE;

  const onNewChat = useCallback(async () => {
    const session = await createSession('New Session', {
      operator: state.operator,
    });

    navigate('/paid-remote', {
      state: {
        operator: state.operator,
        sessionId: session?.id,
        from: 'new',
        isFree: false,
      },
    });
  }, []);

  const onBack = useCallback(async () => {
    navigate('/');
  }, []);

  const handleNewChat = useCallback(() => {
    if (needsConfirm) {
      setPendingAction('newChat');
      setNavDialogOpen(true);
    } else {
      onNewChat();
    }
  }, [needsConfirm]);

  const handleBack = useCallback(() => {
    if (needsConfirm) {
      setPendingAction('back');
      setNavDialogOpen(true);
    } else {
      onBack();
    }
  }, [needsConfirm]);

  const onConfirm = useCallback(async () => {
    await api.stopRun();
    await api.clearHistory();

    if (pendingAction === 'newChat') {
      await onNewChat();
    } else if (pendingAction === 'back') {
      await onBack();
    }
    setPendingAction(null);
    setNavDialogOpen(false);
  }, [pendingAction]);

  const onCancel = useCallback(() => {
    setPendingAction(null);
    setNavDialogOpen(false);
  }, []);

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
      <NavHeader
        title={state.operator}
        onBack={handleBack}
        docUrl="https://github.com/bytedance/UI-TARS-desktop/"
      >
        <Button
          size={'sm'}
          variant={'outline'}
          className="text-red-400 border-red-400 hover:bg-red-50 hover:text-red-500"
          style={{ '-webkit-app-region': 'no-drag' }}
          disabled={disabled}
          onClick={() => onTerminateOpenChange(true)}
        >
          Terminate
        </Button>
      </NavHeader>
      <div className="px-5 pb-5 flex flex-1 gap-5">
        <Card className="flex-1 basis-2/5 px-0 py-4 gap-4 h-[calc(100vh-76px)]">
          <div className="flex items-center justify-between w-full px-4">
            <SidebarTrigger
              variant="secondary"
              className="size-8"
            ></SidebarTrigger>
            <Button
              variant="outline"
              size="sm"
              // className="text-indigo-400 border-indigo-400 hover:bg-indigo-50 hover:text-indigo-500"
              onClick={handleNewChat}
            >
              <MessageCirclePlus />
              New Chat
            </Button>
          </div>
          {renderChatList()}
          <ChatInput
            disabled={disabled}
            operator={state.operator}
            sessionId={state.sessionId}
          />
        </Card>
        <Card className="flex-1 basis-3/5 p-3 h-[calc(100vh-76px)]">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1"
          >
            <TabsList>
              <TabsTrigger value="vnc">{TabName}</TabsTrigger>
              <TabsTrigger value="screenshot">ScreenShot</TabsTrigger>
            </TabsList>
            {/* The `children` inside `TabsContent` are destroyed when switching
                tabs. However, if an iframe is destroyed, the WebSocket (WSS)
                reconnection fails. To prevent this issue, use CSS `hidden` to avoid
                destruction.
            */}
            <div
              className={`${activeTab === 'vnc' ? 'block' : 'hidden'} flex items-center justify-center h-full`}
            >
              {state.operator === Operator.RemoteComputer ? (
                <VNCPreview status={status} queueNum={queueNum} url={rdpUrl} />
              ) : (
                <CDPBrowser status={status} queueNum={queueNum} url={rdpUrl} />
              )}
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
      <TerminateDialog
        open={isTerminateDialogOpen}
        onOpenChange={onTerminateOpenChange}
        onConfirm={releaseResource}
      />
      <NavDialog
        open={isNavDialogOpen}
        onOpenChange={onCancel}
        onConfirm={onConfirm}
      />
    </div>
  );
};

export default RemoteOperator;
