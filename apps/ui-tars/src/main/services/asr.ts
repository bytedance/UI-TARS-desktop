/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { ipcMain, BrowserWindow } from 'electron';
import { randomUUID } from 'crypto';
import { logger } from '../logger';

// 协议常量
const ProtocolVersion = {
  V1: 0b0001,
};

const MessageType = {
  CLIENT_FULL_REQUEST: 0b0001,
  CLIENT_AUDIO_ONLY_REQUEST: 0b0010,
  SERVER_FULL_RESPONSE: 0b1001,
  SERVER_ERROR_RESPONSE: 0b1111,
};

const MessageTypeSpecificFlags = {
  NO_SEQUENCE: 0b0000,
  POS_SEQUENCE: 0b0001,
  NEG_SEQUENCE: 0b0010,
  NEG_WITH_SEQUENCE: 0b0011,
};

const SerializationType = {
  NO_SERIALIZATION: 0b0000,
  JSON: 0b0001,
};

const CompressionType = {
  GZIP: 0b0001,
};

const ASR_CONFIG = {
  SAMPLE_RATE: 16000,
};

// gzip 压缩/解压
import * as zlib from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(zlib.gzip);
const gunzipAsync = promisify(zlib.gunzip);

// ASR协议处理
class ASRProtocol {
  static createRequestHeader(
    messageType: number,
    flags: number,
    serializationType: number,
    compressionType: number,
  ): Buffer {
    const header = Buffer.alloc(4);
    header[0] = (ProtocolVersion.V1 << 4) | 1;
    header[1] = (messageType << 4) | flags;
    header[2] = (serializationType << 4) | compressionType;
    header[3] = 0x00;
    return header;
  }

  static async createFullRequest(seq: number): Promise<Buffer> {
    const header = this.createRequestHeader(
      MessageType.CLIENT_FULL_REQUEST,
      MessageTypeSpecificFlags.POS_SEQUENCE,
      SerializationType.JSON,
      CompressionType.GZIP,
    );

    const payload = {
      user: { uid: 'ui_tars_asr_uid' },
      audio: {
        format: 'pcm',
        codec: 'raw',
        rate: ASR_CONFIG.SAMPLE_RATE,
        bits: 16,
        channel: 1,
      },
      request: {
        model_name: 'bigmodel',
        enable_itn: true,
        enable_punc: true,
        enable_ddc: true,
        show_utterances: true,
        enable_nonstream: false,
      },
    };

    const payloadBytes = Buffer.from(JSON.stringify(payload), 'utf-8');
    const compressed = await gzipAsync(payloadBytes);

    const request = Buffer.alloc(header.length + 4 + 4 + compressed.length);
    let offset = 0;

    header.copy(request, offset);
    offset += header.length;

    request.writeInt32BE(seq, offset);
    offset += 4;

    request.writeUInt32BE(compressed.length, offset);
    offset += 4;

    compressed.copy(request, offset);

    return request;
  }

  static async createAudioRequest(
    seq: number,
    audioData: Buffer,
    isLast: boolean,
  ): Promise<Buffer> {
    const flags = isLast
      ? MessageTypeSpecificFlags.NEG_WITH_SEQUENCE
      : MessageTypeSpecificFlags.POS_SEQUENCE;

    const header = this.createRequestHeader(
      MessageType.CLIENT_AUDIO_ONLY_REQUEST,
      flags,
      SerializationType.JSON,
      CompressionType.GZIP,
    );

    const compressed = await gzipAsync(audioData);
    const actualSeq = isLast ? -seq : seq;

    const request = Buffer.alloc(header.length + 4 + 4 + compressed.length);
    let offset = 0;

    header.copy(request, offset);
    offset += header.length;

    request.writeInt32BE(actualSeq, offset);
    offset += 4;

    request.writeUInt32BE(compressed.length, offset);
    offset += 4;

    compressed.copy(request, offset);

    return request;
  }

  static async parseResponse(
    rawData: Buffer | ArrayBuffer | Buffer[],
  ): Promise<ASRResponse> {
    // 确保数据是 Buffer 类型
    let data: Buffer;
    if (Buffer.isBuffer(rawData)) {
      data = rawData;
    } else if (rawData instanceof ArrayBuffer) {
      data = Buffer.from(rawData);
    } else if (Array.isArray(rawData)) {
      data = Buffer.concat(rawData);
    } else {
      data = Buffer.from(rawData as any);
    }

    const headerSize = data[0] & 0x0f;
    const messageType = data[1] >> 4;
    const flags = data[1] & 0x0f;
    const compressionType = data[2] & 0x0f;

    // 使用 subarray 并确保转换为 Buffer
    let payload = Buffer.from(data.subarray(headerSize * 4));

    const response: ASRResponse = {
      messageType,
      isLast: (flags & 0x02) !== 0,
    };

    let offset = 0;

    if (flags & 0x01) {
      response.sequence = payload.readInt32BE(offset);
      offset += 4;
    }

    if (messageType === MessageType.SERVER_ERROR_RESPONSE) {
      response.code = payload.readInt32BE(offset);
      offset += 4;
    }

    // Skip payload size field (4 bytes) - we don't need the value
    offset += 4;

    let payloadData: Buffer = Buffer.from(payload.subarray(offset));

    if (compressionType === CompressionType.GZIP && payloadData.length > 0) {
      try {
        payloadData = Buffer.from(await gunzipAsync(payloadData));
      } catch (e) {
        logger.error('[ASR] Failed to decompress payload:', e);
      }
    }

    if (payloadData.length > 0) {
      try {
        const text = payloadData.toString('utf-8');
        response.payload = JSON.parse(text);
      } catch (e) {
        logger.error('[ASR] Failed to parse payload:', e);
      }
    }

    return response;
  }
}

interface ASRResponse {
  messageType: number;
  isLast: boolean;
  sequence?: number;
  code?: number;
  payload?: {
    result?: {
      text?: string;
      utterances?: Array<{
        text?: string;
        definite?: boolean;
        start_time?: number;
        end_time?: number;
      }>;
    };
    message?: string;
  };
}

interface ASRConfig {
  appKey: string;
  accessKey: string;
  wsUrl: string;
}

// 使用原生 WebSocket（Node.js 18+ 支持）
import WebSocket from 'ws';

class ASRService {
  private static instance: ASRService;
  private ws: WebSocket | null = null;
  private seq = 1;
  private isRecording = false;
  private config: ASRConfig | null = null;
  private mainWindow: BrowserWindow | null = null;
  // 跟踪已确认的文本，避免重复发送
  private confirmedText: string = '';
  // 跟踪上次发送的临时文本，避免重复发送相同内容
  private lastPendingText: string = '';

  private constructor() {}

  static getInstance(): ASRService {
    if (!ASRService.instance) {
      ASRService.instance = new ASRService();
    }
    return ASRService.instance;
  }

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  private sendToRenderer(channel: string, ...args: unknown[]) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, ...args);
    }
  }

  async startRecording(
    config: ASRConfig,
  ): Promise<{ success: boolean; error?: string }> {
    logger.info('[ASR] startRecording called');
    logger.info('[ASR] Config:', {
      appKey: config.appKey ? 'SET' : 'NOT SET',
      accessKey: config.accessKey ? 'SET' : 'NOT SET',
      wsUrl: config.wsUrl,
    });

    if (!config.appKey || !config.accessKey) {
      const error = '请先配置 APP_KEY 和 ACCESS_KEY';
      logger.error('[ASR]', error);
      return { success: false, error };
    }

    this.config = config;
    this.seq = 1;
    // 重置确认文本跟踪
    this.confirmedText = '';
    this.lastPendingText = '';

    try {
      // 发送状态更新
      this.sendToRenderer('asr:status', 'connecting');

      // 连接 WebSocket
      await this.connectWebSocket();

      // 发送初始配置请求
      logger.info('[ASR] Sending full request, seq:', this.seq);
      const fullRequest = await ASRProtocol.createFullRequest(this.seq);
      this.ws!.send(fullRequest);
      this.seq++;

      // 等待响应
      await new Promise((resolve) => setTimeout(resolve, 500));

      this.isRecording = true;
      this.sendToRenderer('asr:status', 'recording');
      logger.info('[ASR] Recording started');

      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : '启动录音失败';
      logger.error('[ASR] Error starting recording:', err);
      this.sendToRenderer('asr:status', 'error');
      this.sendToRenderer('asr:error', error);
      return { success: false, error };
    }
  }

  async sendAudioData(
    audioData: number[],
    isLast: boolean = false,
  ): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.warn('[ASR] WebSocket not connected');
      return;
    }

    try {
      const buffer = Buffer.from(audioData);
      const request = await ASRProtocol.createAudioRequest(
        this.seq,
        buffer,
        isLast,
      );
      this.ws.send(request);

      if (!isLast) {
        this.seq++;
      }
    } catch (err) {
      logger.error('[ASR] Error sending audio data:', err);
    }
  }

  async stopRecording(): Promise<void> {
    logger.info('[ASR] Stopping recording...');
    this.isRecording = false;

    // 关闭 WebSocket 连接
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {
        logger.error('[ASR] Error closing WebSocket:', e);
      }
      this.ws = null;
    }

    this.sendToRenderer('asr:status', 'idle');
    logger.info('[ASR] Recording stopped');
  }

  private connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.config) {
        reject(new Error('Config not set'));
        return;
      }

      const connectId = randomUUID();
      logger.info('[ASR] Connecting to WebSocket with connectId:', connectId);

      // 创建 WebSocket 连接，使用正确的 headers
      const wsUrl = this.config.wsUrl;

      this.ws = new WebSocket(wsUrl, {
        headers: {
          'X-Api-App-Key': this.config.appKey,
          'X-Api-Access-Key': this.config.accessKey,
          'X-Api-Resource-Id': 'volc.bigasr.sauc.duration',
          'X-Api-Connect-Id': connectId,
        },
      });

      this.ws.binaryType = 'arraybuffer';

      this.ws.on('open', () => {
        logger.info('[ASR] WebSocket connected');
        resolve();
      });

      this.ws.on('error', (err) => {
        logger.error('[ASR] WebSocket error:', err);
        reject(new Error('WebSocket 连接失败，请检查配置'));
      });

      this.ws.on('message', async (data: Buffer | ArrayBuffer | Buffer[]) => {
        try {
          //const size = Buffer.isBuffer(data) ? data.length : (data instanceof ArrayBuffer ? data.byteLength : 'unknown');
          //logger.info('[ASR] Received message, size:', size);
          const response = await ASRProtocol.parseResponse(data);
          //logger.info('[ASR] Parsed response:', JSON.stringify(response));

          if (response.payload?.result?.utterances) {
            const utterances = response.payload.result.utterances;

            // 收集已确认的 utterances 文本
            let newConfirmedText = '';
            let pendingText = '';

            for (const u of utterances) {
              if (u.definite && u.text) {
                newConfirmedText += u.text;
              } else if (!u.definite && u.text) {
                // 只取最后一个未确认的 utterance
                pendingText = u.text;
              }
            }

            // 检查是否有新确认的文本
            if (newConfirmedText && newConfirmedText !== this.confirmedText) {
              // 计算新增的确认文本（去掉之前已确认的部分）
              const newText = newConfirmedText.slice(this.confirmedText.length);
              if (newText) {
                logger.info('[ASR] New confirmed text:', newText);
                this.sendToRenderer('asr:transcript', newText, true);
              }
              this.confirmedText = newConfirmedText;
            }

            // 发送临时文本（如果有变化）
            if (pendingText && pendingText !== this.lastPendingText) {
              logger.info('[ASR] Pending text:', pendingText);
              this.sendToRenderer('asr:transcript', pendingText, false);
              this.lastPendingText = pendingText;
            }
          }

          if (response.code && response.code !== 0) {
            const error = `服务器错误: ${response.payload?.message || '未知错误'}`;
            logger.error('[ASR]', error);
            this.sendToRenderer('asr:error', error);
          }
        } catch (err) {
          logger.error('[ASR] Failed to parse response:', err);
        }
      });

      this.ws.on('close', (code, reason) => {
        logger.info(
          '[ASR] WebSocket closed, code:',
          code,
          'reason:',
          reason.toString(),
        );
        if (this.isRecording) {
          this.sendToRenderer('asr:status', 'idle');
        }
      });
    });
  }

  isActive(): boolean {
    return this.isRecording;
  }
}

export function registerASRHandlers() {
  const asrService = ASRService.getInstance();

  ipcMain.handle('asr:start', async (event, config: ASRConfig) => {
    // 设置主窗口引用
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
      asrService.setMainWindow(window);
    }
    return asrService.startRecording(config);
  });

  ipcMain.handle(
    'asr:sendAudio',
    async (_, audioData: number[], isLast: boolean) => {
      await asrService.sendAudioData(audioData, isLast);
    },
  );

  ipcMain.handle('asr:stop', async () => {
    await asrService.stopRecording();
  });

  ipcMain.handle('asr:isActive', () => {
    return asrService.isActive();
  });
}

export { ASRService };
