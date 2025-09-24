/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { config } from 'dotenv';
import path from 'node:path';
import { AgentModel, ModelProviderName } from '@tarko/agent';
config({ path: path.join(__dirname, '../../', '.env.local') });

export const doubao_1_5_ui_tars: AgentModel = {
  provider: 'volcengine' as ModelProviderName,
  baseURL: process.env.ARK_BASE_URL,
  id: process.env.DOUBAO_1_5_UI_TARS,
  apiKey: process.env.ARK_API_KEY, // secretlint-disable-line
};

export const doubao_1_5_vp: AgentModel = {
  provider: 'volcengine' as ModelProviderName,
  baseURL: process.env.ARK_BASE_URL,
  id: process.env.DOUBAO_1_5_VP,
  apiKey: process.env.ARK_API_KEY, // secretlint-disable-line
};

export const doubao_seed_1_6: AgentModel = {
  provider: 'volcengine' as ModelProviderName,
  baseURL: process.env.ARK_BASE_URL,
  id: process.env.DOUBAO_SEED_1_6,
  apiKey: process.env.ARK_API_KEY, // secretlint-disable-line
};

export const model_o_type_5: AgentModel = {
  provider: 'volcengine' as ModelProviderName,
  baseURL: process.env.O_TARS_BASE_URL,
  id: process.env.O_TARS_5_MODEL_ID,
  apiKey: process.env.O_TARS_API_KEY, // secretlint-disable-line
};

export const model_o_type_6: AgentModel = {
  provider: 'volcengine' as ModelProviderName,
  baseURL: process.env.O_TARS_BASE_URL,
  id: process.env.O_TARS_6_MODEL_ID,
  apiKey: process.env.O_TARS_API_KEY, // secretlint-disable-line
};

export const model_claude_4: AgentModel = {
  provider: 'anthropic' as ModelProviderName,
  baseURL: process.env.ANTHROPIC_BASE_URL,
  id: process.env.ANTHROPIC_MODEL,
  apiKey: process.env.ANTHROPIC_API_KEY, // secretlint-disable-line
};

export const model_openai: AgentModel = {
  provider: 'openai' as ModelProviderName,
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  id: process.env.OPENAI_MODEL || 'gpt-4o',
  apiKey: process.env.OPENAI_API_KEY, // secretlint-disable-line
};

export const model_others: AgentModel = {
  provider: 'openai' as ModelProviderName,
  baseURL: process.env.CUSTOM_BASE_URL,
  id: process.env.CUSTOM_MODEL,
  apiKey: process.env.CUSTOM_API_KEY, // secretlint-disable-line
};
