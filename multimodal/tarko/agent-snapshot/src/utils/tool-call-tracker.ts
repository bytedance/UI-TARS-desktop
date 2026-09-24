/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ToolCallData {
  toolCallId: string;
  name: string;
  args: unknown;
  result?: unknown;
  error?: unknown;
  executionTime?: number;
}

/**
 * Shared utility for tracking tool calls across different hook implementations
 */
export class ToolCallTracker {
  private toolCallsByLoop: Record<number, ToolCallData[]> = {};
  private startTimeByToolCall: Record<string, number> = {};

  initializeLoop(loopNumber: number): void {
    if (!this.toolCallsByLoop[loopNumber]) {
      this.toolCallsByLoop[loopNumber] = [];
    }
  }

  startToolCall(
    loopNumber: number,
    toolCall: { toolCallId: string; name: string },
    args: unknown,
  ): void {
    this.startTimeByToolCall[toolCall.toolCallId] = Date.now();
    this.initializeLoop(loopNumber);

    this.toolCallsByLoop[loopNumber].push({
      toolCallId: toolCall.toolCallId,
      name: toolCall.name,
      args,
    });
  }

  finishToolCall(loopNumber: number, toolCallId: string, result?: unknown, error?: unknown): void {
    const executionTime = Date.now() - (this.startTimeByToolCall[toolCallId] || Date.now());
    const toolCallData = this.findToolCall(loopNumber, toolCallId);

    if (toolCallData) {
      toolCallData.result = result;
      toolCallData.error = error;
      toolCallData.executionTime = executionTime;
    }

    delete this.startTimeByToolCall[toolCallId];
  }

  getToolCallsForLoop(loopNumber: number): ToolCallData[] {
    return this.toolCallsByLoop[loopNumber] || [];
  }

  private findToolCall(loopNumber: number, toolCallId: string): ToolCallData | undefined {
    return this.toolCallsByLoop[loopNumber]?.find((tc) => tc.toolCallId === toolCallId);
  }

  clear(): void {
    this.toolCallsByLoop = {};
    this.startTimeByToolCall = {};
  }
}
