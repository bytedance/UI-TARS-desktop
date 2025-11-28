/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from 'react';

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

import { Play, Send, Square, Loader2, Mic, MicOff } from 'lucide-react';
import { Textarea } from '@renderer/components/ui/textarea';
import { useSession } from '@renderer/hooks/useSession';

import { Operator } from '@main/store/types';
import { useSetting } from '../../hooks/useSetting';

// ASR 状态类型
type ASRStatus = 'idle' | 'connecting' | 'recording' | 'error';

// 默认配置
const ASR_CONFIG = {
  WS_URL: 'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel',
  SAMPLE_RATE: 16000,
};

const ChatInput = ({
  operator,
  sessionId,
  disabled,
  checkBeforeRun,
}: {
  operator: Operator;
  sessionId: string;
  disabled: boolean;
  checkBeforeRun?: () => Promise<boolean>;
}) => {
  const {
    status,
    instructions: savedInstructions,
    messages,
    restUserData,
  } = useStore();
  const [localInstructions, setLocalInstructions] = useState('');
  const { run, stopAgentRuning } = useRunAgent();
  const { getSession, updateSession, chatMessages } = useSession();
  const { settings, updateSetting } = useSetting();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const running = status === StatusEnum.RUNNING;

  // ASR 相关状态
  const [asrStatus, setAsrStatus] = useState<ASRStatus>('idle');
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const isRecording = asrStatus === 'recording';

  // ASR 文本状态：baseText 是录音开始前的文本 + 已确认的识别文本
  const asrBaseTextRef = useRef<string>('');
  // 当前正在识别的临时文本（使用 ref 避免闭包问题）
  const pendingTranscriptRef = useRef<string>('');
  // 追踪是否正在录音，用于忽略停止后的延迟 transcript
  const isRecordingRef = useRef<boolean>(false);

  // 设置 IPC 监听器
  useEffect(() => {
    const unsubStatus = window.electron.asr.onStatus((status: string) => {
      console.log('[ASR] Status from main:', status);
      setAsrStatus(status as ASRStatus);

      if (status === 'recording') {
        isRecordingRef.current = true;
      } else if (status === 'idle') {
        // 在处理之前先标记为非录音状态，忽略后续的延迟 transcript
        isRecordingRef.current = false;

        // 当录音停止时，将临时文本确认到 baseText
        // 注意：localInstructions 已经是正确的值，不需要再次设置
        if (pendingTranscriptRef.current) {
          asrBaseTextRef.current =
            asrBaseTextRef.current + pendingTranscriptRef.current;
          pendingTranscriptRef.current = '';
        }
      }
    });

    const unsubTranscript = window.electron.asr.onTranscript(
      (text: string, isDefinite: boolean) => {
        // 如果不在录音状态，忽略延迟到达的 transcript
        if (!isRecordingRef.current) {
          console.log(
            '[ASR] Ignoring transcript after recording stopped:',
            text,
          );
          return;
        }

        console.log(
          '[ASR] Transcript from main:',
          text,
          'isDefinite:',
          isDefinite,
        );

        if (isDefinite) {
          // 这句话已确定，更新 base text
          asrBaseTextRef.current = asrBaseTextRef.current + text;
          setLocalInstructions(asrBaseTextRef.current);
          pendingTranscriptRef.current = '';
        } else {
          // 临时结果，替换 pending text
          pendingTranscriptRef.current = text;
          setLocalInstructions(asrBaseTextRef.current + text);
        }
      },
    );

    const unsubError = window.electron.asr.onError((error: string) => {
      console.error('[ASR] Error from main:', error);
    });

    return () => {
      unsubStatus();
      unsubTranscript();
      unsubError();
    };
  }, []);

  // Float32 转 16-bit PCM
  const floatTo16BitPCM = useCallback(
    (float32Array: Float32Array): number[] => {
      const result: number[] = [];
      for (let i = 0; i < float32Array.length; i++) {
        const s = Math.max(-1, Math.min(1, float32Array[i]));
        const val = s < 0 ? s * 0x8000 : s * 0x7fff;
        // 转换为 little-endian 16-bit
        result.push(val & 0xff);
        result.push((val >> 8) & 0xff);
      }
      return result;
    },
    [],
  );

  // 开始录音
  const startRecording = useCallback(async () => {
    console.log('[ASR] Starting audio capture...');

    try {
      audioContextRef.current = new AudioContext({
        sampleRate: ASR_CONFIG.SAMPLE_RATE,
      });

      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: ASR_CONFIG.SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      const source = audioContextRef.current.createMediaStreamSource(
        mediaStreamRef.current,
      );
      processorRef.current = audioContextRef.current.createScriptProcessor(
        4096,
        1,
        1,
      );

      processorRef.current.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmData = floatTo16BitPCM(inputData);
        // 发送音频数据到主进程
        window.electron.asr.sendAudio(pcmData, false);
      };

      source.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      console.log('[ASR] Audio capture started');
    } catch (err) {
      console.error('[ASR] Error starting audio capture:', err);
      throw err;
    }
  }, [floatTo16BitPCM]);

  // 停止录音
  const stopRecording = useCallback(async () => {
    console.log('[ASR] Stopping audio capture...');

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      await audioContextRef.current.close();
      audioContextRef.current = null;
    }

    console.log('[ASR] Audio capture stopped');
  }, []);

  // 语音按钮点击处理
  const handleVoiceClick = useCallback(async () => {
    console.log(
      '[ASR] Voice button clicked, current status:',
      asrStatus,
      'isRecording:',
      isRecording,
    );
    console.log('[ASR] Current settings:', {
      asrAppKey: settings.asrAppKey ? '***configured***' : 'NOT SET',
      asrAccessKey: settings.asrAccessKey ? '***configured***' : 'NOT SET',
      asrWsUrl: settings.asrWsUrl || 'default',
    });

    if (isRecording) {
      // 停止录音
      console.log('[ASR] Stopping...');
      await stopRecording();
      await window.electron.asr.stop();
    } else {
      // 开始录音 - 保存当前文本作为 base text
      asrBaseTextRef.current = localInstructions;
      pendingTranscriptRef.current = '';

      const { asrAppKey, asrAccessKey, asrWsUrl } = settings;

      if (!asrAppKey || !asrAccessKey) {
        console.warn('[ASR] ASR 未配置，请在设置中配置 APP_KEY 和 ACCESS_KEY');
        return;
      }

      console.log('[ASR] Starting...');

      try {
        // 先通过 IPC 启动主进程的 ASR 服务
        const result = await window.electron.asr.start({
          appKey: asrAppKey,
          accessKey: asrAccessKey,
          wsUrl: asrWsUrl || ASR_CONFIG.WS_URL,
        });

        if (!result.success) {
          console.error('[ASR] Failed to start:', result.error);
          return;
        }

        // 然后开始录音
        await startRecording();
        console.log('[ASR] Started successfully');
      } catch (error) {
        console.error('[ASR] Error starting:', error);
        await window.electron.asr.stop();
      }
    }
  }, [
    isRecording,
    asrStatus,
    settings,
    startRecording,
    stopRecording,
    localInstructions,
  ]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      stopRecording();
      window.electron.asr.stop();
    };
  }, [stopRecording]);

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

  useEffect(() => {
    switch (operator) {
      case Operator.RemoteComputer:
        updateSetting({ ...settings, operator: Operator.RemoteComputer });
        break;
      case Operator.RemoteBrowser:
        updateSetting({ ...settings, operator: Operator.RemoteBrowser });
        break;
      case Operator.LocalComputer:
        updateSetting({ ...settings, operator: Operator.LocalComputer });
        break;
      case Operator.LocalBrowser:
        updateSetting({ ...settings, operator: Operator.LocalBrowser });
        break;
      default:
        updateSetting({ ...settings, operator: Operator.LocalComputer });
        break;
    }
  }, [operator]);

  const getInstantInstructions = () => {
    if (localInstructions?.trim()) {
      return localInstructions;
    }
    if (isCallUser && savedInstructions?.trim()) {
      return savedInstructions;
    }
    return '';
  };

  // console.log('running', 'status', status, running);

  const startRun = async () => {
    if (checkBeforeRun) {
      const checked = await checkBeforeRun();

      if (!checked) {
        return;
      }
    }

    const instructions = getInstantInstructions();

    console.log('startRun', instructions, restUserData);

    let history = chatMessages;

    const session = await getSession(sessionId);
    await updateSession(sessionId, {
      name: instructions,
      meta: {
        ...session!.meta,
        ...(restUserData || {}),
      },
    });

    run(instructions, history, () => {
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

  const isCallUser = useMemo(() => status === StatusEnum.CALL_USER, [status]);

  const lastHumanMessage =
    [...(messages || [])]
      .reverse()
      .find((m) => m?.from === 'human' && m?.value !== IMAGE_PLACEHOLDER)
      ?.value || '';

  const stopRun = async () => {
    await stopAgentRuning(() => {
      setLocalInstructions('');
    });
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
        disabled={!getInstantInstructions() || disabled}
      >
        <Send className="h-4 w-4" />
      </Button>
    );
  };

  return (
    <div className="px-4 w-full">
      <div className="flex flex-col space-y-4">
        <div className="relative w-full">
          <Textarea
            ref={textareaRef}
            placeholder={
              isCallUser && savedInstructions
                ? `${savedInstructions}`
                : running && lastHumanMessage && messages?.length > 1
                  ? lastHumanMessage
                  : '请告诉我您需要什么帮助'
            }
            className="min-h-[120px] rounded-2xl resize-none px-4 pb-16" // 调整内边距
            value={localInstructions}
            disabled={running || disabled}
            onChange={(e) => setLocalInstructions(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="absolute right-4 bottom-4 flex items-center gap-2">
            {running && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isRecording ? 'destructive' : 'ghost'}
                    size="icon"
                    className={`h-8 w-8 ${isRecording ? 'animate-pulse' : ''}`}
                    onClick={handleVoiceClick}
                    disabled={running || disabled || asrStatus === 'connecting'}
                  >
                    {asrStatus === 'connecting' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isRecording ? (
                      <MicOff className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {isRecording
                      ? '点击停止语音识别'
                      : settings.asrAppKey
                        ? '点击开始语音识别'
                        : '请先在设置中配置 ASR'}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {renderButton()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
