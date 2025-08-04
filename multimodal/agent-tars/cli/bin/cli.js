#!/usr/bin/env -S node --no-warnings
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

const { version } = require('../package.json');
const { AgentTARSCLI } = require('../dist');
new AgentTARSCLI({ version }).bootstrap();
