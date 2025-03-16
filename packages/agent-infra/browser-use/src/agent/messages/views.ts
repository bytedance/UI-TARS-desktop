/**
 * The following code is modified based on
 * https://github.com/nanobrowser/nanobrowser/blob/master/chrome-extension/src/background/agent/messages/views.ts
 *
 * Apache-2.0 License
 * Copyright (c) 2024 alexchenzl
 * https://github.com/nanobrowser/nanobrowser/blob/master/LICENSE
 */
import { type BaseMessage, HumanMessage } from '@langchain/core/messages';

export interface MessageMetadata {
  inputTokens: number;
}

export interface ManagedMessage {
  message: BaseMessage;
  metadata: MessageMetadata;
}

export class MessageHistory {
  messages: ManagedMessage[] = [];
  totalTokens = 0;

  addMessage(
    message: BaseMessage,
    metadata: MessageMetadata = { inputTokens: 0 },
    position?: number,
  ): void {
    const managedMessage: ManagedMessage = {
      message,
      metadata,
    };

    if (position === undefined) {
      this.messages.push(managedMessage);
    } else {
      this.messages.splice(position, 0, managedMessage);
    }
    this.totalTokens += metadata.inputTokens;
  }

  removeMessage(index = -1): void {
    if (this.messages.length > 0) {
      const msg = this.messages.splice(index, 1)[0];
      this.totalTokens -= msg.metadata.inputTokens;
    }
  }

  /**
   * Removes the last message from the history if it is a human message.
   * This is used to remove the state message from the history.
   */
  removeLastHumanMessage(): void {
    if (
      this.messages.length > 2 &&
      this.messages[this.messages.length - 1].message instanceof HumanMessage
    ) {
      const msg = this.messages.pop();
      if (msg) {
        this.totalTokens -= msg.metadata.inputTokens;
      }
    }
  }
}
