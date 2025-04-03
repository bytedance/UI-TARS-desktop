import { z } from 'zod';
import type { ToolDefinition } from './types';

/**
 * Tool class for defining agent tools
 */
export class Tool<T extends z.ZodObject<any>> implements ToolDefinition {
  public name: string;
  public description: string;
  public schema: T;
  public function: (args: z.infer<T>) => Promise<any> | any;

  constructor(options: {
    id: string;
    description: string;
    parameters: T;
    function: (input: z.infer<T>) => Promise<any> | any;
  }) {
    this.name = options.id;
    this.description = options.description;
    this.schema = options.parameters;
    this.function = options.function;
  }
}
