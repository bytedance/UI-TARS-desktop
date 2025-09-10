#!/bin/bash

# Agent Server Next Build Script
# Copyright (c) 2025 Bytedance, Inc. and its affiliates.
# SPDX-License-Identifier: Apache-2.0

set -e

echo "🏗️  Building @tarko/agent-server-next..."

# Clean previous build
rm -rf dist

# Run rslib build
pnpm run build

echo "✅ Build completed successfully!"
echo "📦 Output: dist/"