/*
 * Copyright (C) 2025 Bytedance Ltd. and/or its affiliates
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { VlmModeEnum } from '../constants/vlm';
import { Message, PredictionParsed, StatusEnum } from './index';
import { ShareVersion } from './share';

export interface Conversation extends Message {
  timing?: {
    start: number;
    end: number;
    cost: number;
  };
  /** exists when <image> exists */
  screenshotBase64?: string;
  screenshotContext?: {
    size: {
      width: number;
      height: number;
    };
  };
  predictionParsed?: PredictionParsed[];
  /** exists when predictionParsed exists */
  screenshotBase64WithElementMarker?: string;
  reflections?: string[];
}

/**
 * Computer Use data structure, can be used for recording and sharing
 */
export interface ComputerUseUserData {
  version: ShareVersion;
  /** Share operation instructions */
  instruction: string;
  systemPrompt: string;
  modelName: string;
  mode: VlmModeEnum;
  logTime: number;
  status: StatusEnum;
  errMsg?: string;
  conversations: Conversation[];
}
