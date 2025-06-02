/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { zodToJsonSchema as originalZodToJsonSchema } from 'zod-to-json-schema';
import { ZodType } from '@multimodal/model-provider';
import type { JSONSchema7 as JSONSchema } from 'json-schema';

/**
 * Type guard to check if the parameter is a Zod schema
 */
function isZodSchema(schema: any): schema is ZodType {
  return schema instanceof ZodType;
}

/**
 * Convert schema to JSON schema, handling both Zod and direct JSON Schema inputs
 */
export const zodToJsonSchema = (schema: ZodType | JSONSchema): JSONSchema => {
  // If it's already a JSON schema, return it directly
  if (!isZodSchema(schema)) {
    return schema as JSONSchema;
  }

  // Otherwise, convert from Zod
  const originalSchema = originalZodToJsonSchema(schema);

  const removeUnwantedFields = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(removeUnwantedFields);
    }

    const newObj: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'additionalProperties' && value === false) {
        continue;
      }
      if (key !== '$schema') {
        newObj[key] = removeUnwantedFields(value);
      }
    }

    return newObj;
  };

  return removeUnwantedFields(originalSchema);
};

/**
 * Format tool parameters into a more readable form
 */
export function formatToolParameters(schema: JSONSchema): string {
  if (!schema.properties) {
    return 'No parameters required';
  }

  const properties = schema.properties;
  const requiredProps = schema.required || [];

  return Object.entries(properties)
    .map(([name, prop]: [string, any]) => {
      const isRequired = requiredProps.includes(name);
      return `- ${name}${isRequired ? ' (required)' : ''}: ${prop.description || 'No description'} (type: ${prop.type})`;
    })
    .join('\n');
}
