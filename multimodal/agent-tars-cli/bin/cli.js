#!/usr/bin/env node
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

const { version } = require('../package.json');
require('../dist').bootstrapCli({ version, binName: 'agent-tars' });
