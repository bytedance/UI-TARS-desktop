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
import { SidebarTrigger, useSidebar } from '@renderer/components/ui/sidebar';
import { NavHeader } from '@renderer/components/Detail/NavHeader';
import { ScrollArea } from '@renderer/components/ui/scroll-area';

import { useStore } from '@renderer/hooks/useStore';
import { useSession } from '@renderer/hooks/useSession';
import { useRunAgent } from '@renderer/hooks/useRunAgent';
import { useSetting } from '@renderer/hooks/useSetting';
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
import { PredictionParsed, StatusEnum } from '@ui-tars/shared/types';
import { RouterState } from '../../typings';
import ChatInput from '../../components/ChatInput';
import { NavDialog } from '../../components/AlertDialog/navDialog';
import {
  checkVLMSettings,
  LocalSettingsDialog,
} from '../../components/Settings/local';
import { sleep } from '@ui-tars/shared/utils';

const getFinishedContent = (predictionParsed?: PredictionParsed[]) =>
  predictionParsed?.find(
    (step) =>
      step.action_type === 'finished' &&
      typeof step.action_inputs?.content === 'string' &&
      step.action_inputs.content.trim() !== '',
  )?.action_inputs?.content as string | undefined;

const LocalOperator = () => {
  const state = useLocation().state as RouterState;
  const navigate = useNavigate();
  const { setOpen } = useSidebar();
  const { settings } = useSetting();

  const { status, messages = [], thinking, errorMsg } = useStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const defaultSuggestions: string[] = [
    '打开浏览器用携程搜索后天深圳飞往北京的机票',
    '用钉钉帮我创建一个今天晚上七点的会议日程',
    '打开浏览器用淘宝搜索65寸OLED电视',
    '用钉钉给谢建辉发一条消息，内容是：你好，我是GUIAgent',
    '用Word写一篇关于AI Agent的300字报告，并保存到桌面',
    '关闭所有浏览器窗口',
  ];
  const suggestions =
    settings.commandSuggestions && settings.commandSuggestions.length > 0
      ? settings.commandSuggestions
      : defaultSuggestions;
  const [selectImg, setSelectImg] = useState<number | undefined>(undefined);
  const [initId, setInitId] = useState('');
  const {
    currentSessionId,
    setActiveSession,
    updateMessages,
    createSession,
    chatMessages,
  } = useSession();
  const [pendingAction, setPendingAction] = useState<'newChat' | 'back' | null>(
    null,
  );
  const [isNavDialogOpen, setNavDialogOpen] = useState(false);
  const [localOpen, setLocalOpen] = useState(false);

  useEffect(() => {
    const update = async () => {
      if (state.sessionId) {
        await setActiveSession(state.sessionId);
        setInitId(state.sessionId);
      }
    };
    update();
    setOpen(false);
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

    if (messages.length) {
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

      updateMessages(state.sessionId, allMessages);
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

  // Reset suggestions when there are new chat messages
  useEffect(() => {
    if (chatMessages?.length > 0) {
      setShowSuggestions(false);
    }
  }, [chatMessages]);

  const { run } = useRunAgent();
  const { getSession, updateSession } = useSession();

  const handleSelect = async (suggestion: string) => {
    // Update the session name
    const session = await getSession(state.sessionId);
    await updateSession(state.sessionId, {
      name: suggestion,
      meta: {
        ...session!.meta,
      },
    });

    // 在当前会话中插入用户消息
    const newMessage = {
      from: 'human' as const,
      value: suggestion,
      timing: { start: Date.now(), end: Date.now(), cost: 0 },
    };

    // 更新会话消息
    const updatedMessages = [...chatMessages, newMessage];
    updateMessages(state.sessionId, updatedMessages);

    // 隐藏建议区
    setShowSuggestions(false);

    // 滚动到底部以显示最新消息
    setTimeout(() => {
      containerRef.current?.scrollIntoView(false);
    }, 100);

    // 调用run函数启动agent
    run(suggestion, updatedMessages, () => {
      // Clear the instructions after run starts
    });
  };

  const handleImageSelect = async (index: number) => {
    setSelectImg(index);
  };

  // check status before nav
  const needsConfirm =
    status === StatusEnum.RUNNING ||
    status === StatusEnum.CALL_USER ||
    status === StatusEnum.PAUSE;

  const onNewChat = useCallback(async () => {
    const session = await createSession('New Session', {
      operator: state.operator,
    });

    navigate('/local', {
      state: {
        operator: state.operator,
        sessionId: session?.id,
        from: 'new',
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
      setShowSuggestions(true);
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

  const handleLocalSettingsSubmit = async () => {
    setLocalOpen(false);

    await sleep(200);
  };

  const handleLocalSettingsClose = () => {
    setLocalOpen(false);
  };

  const checkVLM = async () => {
    const hasVLM = await checkVLMSettings();

    if (hasVLM) {
      return true;
    } else {
      setLocalOpen(true);
      return false;
    }
  };

  const renderChatList = () => {
    return (
      <ScrollArea className="h-full px-4">
        <div ref={containerRef}>
          {!chatMessages?.length &&
            suggestions?.length > 0 &&
            showSuggestions && (
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

            const {
              predictionParsed,
              screenshotBase64WithElementMarker,
              value,
              isPredictionSuggestions,
            } = message as any;

            // Find the finished step (VL 1.5 Model)
            const finishedStep = getFinishedContent(predictionParsed);

            // 检查是否是建议动作消息
            if (isPredictionSuggestions && value) {
              const lines = value
                .split('\n')
                .map((line) => line.trim())
                .filter((line) => line);
              const suggestions = lines.filter(
                (line) =>
                  !line.includes('接下来要不要我帮您') &&
                  !line.includes('：') &&
                  line.length > 0,
              );

              return (
                <div key={idx} className="mb-4">
                  <div className="flex justify-start mb-2">
                    <div className="max-w-[80%] px-4 py-2 rounded-lg bg-gray-100 text-gray-700">
                      <div className="font-medium mb-2">
                        接下来要不要我帮您：
                      </div>
                      <div className="flex flex-col gap-2">
                        {suggestions.map((suggestion, sIdx) => (
                          <button
                            key={sIdx}
                            onClick={() => handleSelect(suggestion)}
                            className="px-4 py-2.5 bg-white rounded-lg shadow-sm border border-gray-200 
                                     hover:bg-gray-50 hover:border-gray-300 hover:shadow-md
                                     active:bg-gray-100 active:scale-[0.98]
                                     transition-all duration-150 ease-in-out
                                     text-left text-sm text-gray-700 cursor-pointer"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

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

                {/* 显示没有 predictionParsed 但有 value 的 gpt 消息（如预测的下一步动作） */}
                {!predictionParsed && value && !isPredictionSuggestions && (
                  <AssistantTextMessage text={value} />
                )}
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
        title="返回主页" //{state.operator}
        onBack={handleBack}
        docUrl="https://github.com/bytedance/UI-TARS-desktop/"
      ></NavHeader>
      <div className="px-5 pb-5 flex flex-1 gap-5">
        <Card className="flex-1 basis-2/5 px-0 py-4 gap-4 h-[calc(100vh-76px)]">
          <div className="flex items-center justify-between w-full px-4">
            <SidebarTrigger
              variant="secondary"
              className="size-8"
            ></SidebarTrigger>
            <Button variant="outline" size="sm" onClick={handleNewChat}>
              <MessageCirclePlus />
              新建对话
            </Button>
          </div>
          {renderChatList()}
          <ChatInput
            disabled={false}
            operator={state.operator}
            sessionId={state.sessionId}
            checkBeforeRun={checkVLM}
          />
        </Card>
        <Card className="flex-1 basis-3/5 p-3 h-[calc(100vh-76px)]">
          <Tabs defaultValue="screenshot" className="flex-1">
            <TabsList>
              <TabsTrigger value="screenshot">屏幕截图</TabsTrigger>
            </TabsList>
            <TabsContent value="screenshot">
              <ImageGallery
                messages={chatMessages}
                selectImgIndex={selectImg}
              />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
      <NavDialog
        open={isNavDialogOpen}
        onOpenChange={onCancel}
        onConfirm={onConfirm}
      />
      <LocalSettingsDialog
        isOpen={localOpen}
        onSubmit={handleLocalSettingsSubmit}
        onClose={handleLocalSettingsClose}
      />
    </div>
  );
};

export default LocalOperator;
