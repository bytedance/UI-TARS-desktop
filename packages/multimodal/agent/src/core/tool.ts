/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { z } from 'zod';
import type { JSONSchema7 } from 'json-schema';
import type { ToolParameters } from '../types';

/**
 * Type guard to check if the parameter is a Zod schema
 */
function isZodSchema(schema: any): schema is z.ZodObject<any> {
  return schema instanceof z.ZodObject;
}

/**
 * Type guard to check if the parameter is a JSON schema
 */
function isJsonSchema(schema: any): schema is JSONSchema7 {
  return (
    schema !== null &&
    typeof schema === 'object' &&
    !isZodSchema(schema) &&
    (schema.type === 'object' || schema.properties !== undefined)
  );
}

/**
 * Tool class for defining agent tools
 *
 * FIXME: [Contribution Welcome]: We now support type inference for tools
 * that use zod schema to define parameters, We also need to support
 * inferring the function input parameter types of Tools that use JSON Schema
 * to define parameters.
 */
export class Tool<T extends ToolParameters = any> {
  public name: string;
  public description: string;
  public schema: z.ZodObject<T> | JSONSchema7;
  public function: (args: T) => Promise<any> | any;

  constructor(options: {
    id: string;
    description: string;
    parameters: z.ZodObject<T> | JSONSchema7;
    function: (input: T) => Promise<any> | any;
  }) {
    this.name = options.id;
    this.description = options.description;
    this.schema = options.parameters;
    this.function = options.function;
  }

  /**
   * Check if the tool uses Zod schema
   */
  hasZodSchema(): boolean {
    return isZodSchema(this.schema);
  }

  /**
   * Check if the tool uses JSON schema
   */
  hasJsonSchema(): boolean {
    return isJsonSchema(this.schema);
  }
}
