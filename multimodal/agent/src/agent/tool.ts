/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { z } from '@multimodal/model-provider';
import type { JSONSchema7 } from 'json-schema';
import type { ToolDefinition, ToolParameters } from '@multimodal/agent-interface';

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
 * Supports type inference for parameters defined with both Zod schema and JSON Schema.
 */

export class Tool<
  TSchema extends z.ZodObject<any> | JSONSchema7 = any,
  TParams = TSchema extends z.ZodObject<any> ? z.infer<TSchema> : any,
> implements ToolDefinition
{
  public name: string;
  public description: string;

  public schema: TSchema;
  public function: (args: TParams) => Promise<any> | any;

  constructor(options: {
    id: string;
    description: string;
    parameters: TSchema;
    function: (input: TParams) => Promise<any> | any;
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
