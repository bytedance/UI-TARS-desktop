/**
 * The following code is modified based on
 * https://github.com/token-js/token.js/blob/main/src/handlers/types.ts
 *
 * MIT License
 * Copyright (c) 2024 RPate97
 * https://github.com/token-js/token.js/blob/main/LICENSE
 */

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool' | 'function' | 'developer';
export type MIMEType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

export class InputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class InvariantError extends Error {
  constructor(message: string) {
    super(`${message}\n` + `Should never happen. Please report this error to the developers.`);
    this.name = 'InvariantError';
    Error.captureStackTrace(this, this.constructor);
  }
}
