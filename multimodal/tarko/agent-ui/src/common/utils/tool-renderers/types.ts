/**
 * Configuration for mapping tools to renderers
 * Each condition is evaluated in order, first match wins
 */
export type ToolToRendererCondition =
  | StaticToolToRendererCondition
  | FunctionToolToRendererCondition;

export type StaticToolToRendererCondition = {
  toolName: string;
  renderer: string;
};

export type FunctionToolToRendererCondition = (
  toolName: string,
  toolResponse: any,
) => string | null; // Returns renderer name or null if condition doesn't match
