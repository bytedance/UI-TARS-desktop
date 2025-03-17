import { CompatibilityCallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

export type MCPToolResult = z.infer<typeof CompatibilityCallToolResultSchema>[];
