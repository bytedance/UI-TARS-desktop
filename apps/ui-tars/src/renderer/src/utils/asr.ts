/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

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

// 默认配置
export const ASR_CONFIG = {
  WS_URL: 'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel',
  SAMPLE_RATE: 16000,
  SEGMENT_DURATION: 200,
};

export const ASR_WS_URLS = [
  {
    label: '实时识别（bigmodel）',
    value: 'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel',
  },
  {
    label: '异步识别（bigmodel_async）',
    value: 'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_async',
  },
  {
    label: '非流式识别（bigmodel_nostream）',
    value: 'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_nostream',
  },
];

// ASR协议处理类
class ASRProtocol {
  static createRequestHeader(
    messageType: number,
    flags: number,
    serializationType: number,
    compressionType: number,
  ): Uint8Array {
    const header = new Uint8Array(4);
    header[0] = (ProtocolVersion.V1 << 4) | 1;
    header[1] = (messageType << 4) | flags;
    header[2] = (serializationType << 4) | compressionType;
    header[3] = 0x00;
    return header;
  }

  static async gzipCompress(data: Uint8Array): Promise<Uint8Array> {
    const cs = new CompressionStream('gzip');
    const writer = cs.writable.getWriter();
    writer.write(data);
    writer.close();

    const chunks: Uint8Array[] = [];
    const reader = cs.readable.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result;
  }

  static async gzipDecompress(data: Uint8Array): Promise<Uint8Array> {
    const ds = new DecompressionStream('gzip');
    const writer = ds.writable.getWriter();
    writer.write(data);
    writer.close();

    const chunks: Uint8Array[] = [];
    const reader = ds.readable.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result;
  }

  static async createFullRequest(seq: number): Promise<Uint8Array> {
    const header = this.createRequestHeader(
      MessageType.CLIENT_FULL_REQUEST,
      MessageTypeSpecificFlags.POS_SEQUENCE,
      SerializationType.JSON,
      CompressionType.GZIP,
    );

    const payload = {
      user: { uid: 'ui_tars_asr_uid' },
      audio: {
        format: 'wav',
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

    const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
    const compressed = await this.gzipCompress(payloadBytes);

    const request = new Uint8Array(header.length + 4 + 4 + compressed.length);
    let offset = 0;

    request.set(header, offset);
    offset += header.length;

    const seqView = new DataView(request.buffer);
    seqView.setInt32(offset, seq, false);
    offset += 4;

    seqView.setUint32(offset, compressed.length, false);
    offset += 4;

    request.set(compressed, offset);

    return request;
  }

  static async createAudioRequest(
    seq: number,
    audioData: Uint8Array,
    isLast: boolean,
  ): Promise<Uint8Array> {
    const flags = isLast
      ? MessageTypeSpecificFlags.NEG_WITH_SEQUENCE
      : MessageTypeSpecificFlags.POS_SEQUENCE;

    const header = this.createRequestHeader(
      MessageType.CLIENT_AUDIO_ONLY_REQUEST,
      flags,
      SerializationType.JSON,
      CompressionType.GZIP,
    );

    const compressed = await this.gzipCompress(audioData);
    const actualSeq = isLast ? -seq : seq;

    const request = new Uint8Array(header.length + 4 + 4 + compressed.length);
    let offset = 0;

    request.set(header, offset);
    offset += header.length;

    const view = new DataView(request.buffer);
    view.setInt32(offset, actualSeq, false);
    offset += 4;

    view.setUint32(offset, compressed.length, false);
    offset += 4;

    request.set(compressed, offset);

    return request;
  }

  static async parseResponse(data: Uint8Array): Promise<ASRResponse> {
    const headerSize = data[0] & 0x0f;
    const messageType = data[1] >> 4;
    const flags = data[1] & 0x0f;
    const compressionType = data[2] & 0x0f;

    let payload = data.slice(headerSize * 4);
    const view = new DataView(
      payload.buffer,
      payload.byteOffset,
      payload.byteLength,
    );

    const response: ASRResponse = {
      messageType,
      isLast: (flags & 0x02) !== 0,
    };

    let offset = 0;

    if (flags & 0x01) {
      response.sequence = view.getInt32(offset, false);
      offset += 4;
    }

    if (messageType === MessageType.SERVER_ERROR_RESPONSE) {
      response.code = view.getInt32(offset, false);
      offset += 4;
    }

    // Skip payload size field (4 bytes) - we don't need the value
    offset += 4;

    let payloadData: Uint8Array = payload.slice(offset);

    if (compressionType === CompressionType.GZIP && payloadData.length > 0) {
      try {
        payloadData = new Uint8Array(await this.gzipDecompress(payloadData));
      } catch (e) {
        console.error('Failed to decompress payload:', e);
      }
    }

    if (payloadData.length > 0) {
      try {
        const text = new TextDecoder().decode(payloadData);
        response.payload = JSON.parse(text);
      } catch (e) {
        console.error('Failed to parse payload:', e);
      }
    }

    return response;
  }
}

// 音频处理类
class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;

  async startRecording(onData: (data: Uint8Array) => void): Promise<void> {
    this.audioContext = new AudioContext({
      sampleRate: ASR_CONFIG.SAMPLE_RATE,
    });
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: ASR_CONFIG.SAMPLE_RATE,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      // 转换为 16-bit PCM
      const pcm = this.floatTo16BitPCM(inputData);
      onData(pcm);
    };

    source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
  }

  stopRecording(): void {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  private floatTo16BitPCM(float32Array: Float32Array): Uint8Array {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);

    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    return new Uint8Array(buffer);
  }
}

// 类型定义
export interface ASRResponse {
  messageType: number;
  isLast: boolean;
  sequence?: number;
  code?: number;
  payload?: {
    result?: {
      text?: string;
    };
    message?: string;
  };
}

export interface ASRConfig {
  appKey: string;
  accessKey: string;
  wsUrl: string;
}

export type ASRStatus = 'idle' | 'connecting' | 'recording' | 'error';

export interface ASRCallbacks {
  onStatusChange?: (status: ASRStatus) => void;
  onTranscript?: (text: string, isFinal?: boolean) => void;
  onError?: (error: string) => void;
}

// ASR客户端类
export class ASRClient {
  private config: ASRConfig;
  private callbacks: ASRCallbacks;
  private ws: WebSocket | null = null;
  private audioProcessor: AudioProcessor | null = null;
  private seq = 1;
  private audioBuffer: Uint8Array[] = [];
  private sendInterval: ReturnType<typeof setInterval> | null = null;
  private isRecording = false;

  constructor(config: ASRConfig, callbacks: ASRCallbacks = {}) {
    this.config = config;
    this.callbacks = callbacks;
  }

  private setStatus(status: ASRStatus) {
    console.log('[ASRClient] Status changing to:', status);
    this.callbacks.onStatusChange?.(status);
  }

  private onError(error: string) {
    console.error('[ASRClient] Error:', error);
    this.callbacks.onError?.(error);
    this.setStatus('error');
  }

  async startRecording(): Promise<void> {
    console.log('[ASRClient] startRecording called');
    console.log(
      '[ASRClient] Config check - appKey:',
      this.config.appKey ? 'SET' : 'NOT SET',
      'accessKey:',
      this.config.accessKey ? 'SET' : 'NOT SET',
    );

    if (!this.config.appKey || !this.config.accessKey) {
      console.error('[ASRClient] Missing appKey or accessKey');
      this.onError('请先配置 APP_KEY 和 ACCESS_KEY');
      return;
    }

    try {
      console.log('[ASRClient] Setting status to connecting');
      this.setStatus('connecting');
      this.seq = 1;
      this.audioBuffer = [];

      // 连接 WebSocket
      console.log('[ASRClient] Connecting to WebSocket...');
      await this.connectWebSocket();
      console.log('[ASRClient] WebSocket connected successfully');

      // 发送初始配置请求
      console.log('[ASRClient] Creating full request...');
      const fullRequest = await ASRProtocol.createFullRequest(this.seq);
      console.log('[ASRClient] Sending full request, seq:', this.seq);
      this.ws!.send(fullRequest);
      this.seq++;

      // 等待响应
      console.log('[ASRClient] Waiting for initial response...');
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 开始录音
      console.log('[ASRClient] Starting audio recording...');
      this.audioProcessor = new AudioProcessor();
      await this.audioProcessor.startRecording((pcmData) => {
        this.audioBuffer.push(pcmData);
      });
      console.log('[ASRClient] Audio recording started');

      this.isRecording = true;
      this.setStatus('recording');
      console.log('[ASRClient] Status set to recording');

      // 定时发送音频数据
      this.sendInterval = setInterval(async () => {
        if (this.audioBuffer.length === 0 || !this.ws) return;

        const audioData = this.audioBuffer.shift()!;
        const request = await ASRProtocol.createAudioRequest(
          this.seq,
          audioData,
          false,
        );

        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(request);
          this.seq++;
        }
      }, ASR_CONFIG.SEGMENT_DURATION);
      console.log('[ASRClient] Audio send interval started');
    } catch (err) {
      console.error('[ASRClient] Error in startRecording:', err);
      this.onError(err instanceof Error ? err.message : '启动录音失败');
    }
  }

  async stopRecording(): Promise<void> {
    try {
      this.isRecording = false;

      // 停止录音
      if (this.audioProcessor) {
        this.audioProcessor.stopRecording();
        this.audioProcessor = null;
      }

      // 发送最后一个音频包
      if (this.ws && this.audioBuffer.length > 0) {
        const lastAudio = this.audioBuffer[this.audioBuffer.length - 1];
        const lastRequest = await ASRProtocol.createAudioRequest(
          this.seq,
          lastAudio,
          true,
        );
        this.ws.send(lastRequest);
      }

      // 清理定时器
      if (this.sendInterval) {
        clearInterval(this.sendInterval);
        this.sendInterval = null;
      }

      // 关闭连接
      setTimeout(() => {
        if (this.ws) {
          this.ws.close();
          this.ws = null;
        }
      }, 1000);

      this.setStatus('idle');
    } catch (err) {
      this.onError(err instanceof Error ? err.message : '停止录音失败');
      console.error('Stop recording error:', err);
    }
  }

  private connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      // 创建带认证头的URL
      console.log('[ASRClient] Building WebSocket URL...');
      const url = new URL(this.config.wsUrl);
      url.searchParams.set('X-Api-Resource-Id', 'volc.bigasr.sauc.duration');
      url.searchParams.set(
        'X-Api-Request-Id',
        crypto.randomUUID?.() || Date.now().toString(),
      );
      url.searchParams.set('X-Api-Access-Key', this.config.accessKey);
      url.searchParams.set('X-Api-App-Key', this.config.appKey);

      console.log(
        '[ASRClient] Connecting to:',
        url
          .toString()
          .replace(/X-Api-Access-Key=[^&]+/, 'X-Api-Access-Key=***'),
      );

      this.ws = new WebSocket(url.toString());
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        console.log('[ASRClient] WebSocket connected');
        resolve();
      };

      this.ws.onerror = (err) => {
        console.error('[ASRClient] WebSocket error:', err);
        reject(new Error('WebSocket 连接失败，请检查配置'));
      };

      this.ws.onmessage = async (event) => {
        try {
          console.log(
            '[ASRClient] Received message, size:',
            event.data.byteLength,
          );
          const response = await ASRProtocol.parseResponse(
            new Uint8Array(event.data),
          );
          console.log('[ASRClient] Parsed response:', response);

          if (response.payload?.result?.text) {
            console.log(
              '[ASRClient] Transcript received:',
              response.payload.result.text,
            );
            this.callbacks.onTranscript?.(
              response.payload.result.text,
              response.isLast,
            );
          }

          if (response.code && response.code !== 0) {
            this.onError(
              `服务器错误: ${response.payload?.message || '未知错误'}`,
            );
          }
        } catch (err) {
          console.error('[ASRClient] Failed to parse response:', err);
        }
      };

      this.ws.onclose = (event) => {
        console.log(
          '[ASRClient] WebSocket closed, code:',
          event.code,
          'reason:',
          event.reason,
        );
        if (this.isRecording) {
          this.setStatus('idle');
        }
      };
    });
  }

  isActive(): boolean {
    return this.isRecording;
  }
}
