/**
 * Normalize system prompts for cross-platform testing
 * Replaces platform-specific references with generic ones
 */
export function normalizeSystemPromptForSnapshot(prompt: string): string {
  return prompt.replace(/darwin/gi, 'tars');
}
