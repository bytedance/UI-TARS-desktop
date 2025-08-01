/**
 * Types for the Generic Result Renderer components
 */

/**
 * Result type classification for different UI treatments
 */
export type ResultType = 'success' | 'error' | 'info' | 'empty';

/**
 * Operation type for specialized UI treatments
 */
export type OperationType = 'navigate' | 'click' | 'type' | 'scroll' | 'browser' | '';

/**
 * Analyzed result information extracted from raw tool output
 */
export interface AnalyzedResult {
  /** The type of result (success, error, etc) */
  type: ResultType;

  /** The title to display for this result */
  title: string;

  /** The main message content */
  message: string | null;

  /** Additional detailed information as key-value pairs */
  details: Record<string, any>;

  /** URL if this result relates to navigation */
  url?: string;

  /** The type of operation performed */
  operation?: OperationType;
}

/**
 * Display mode for markdown content
 */
export type DisplayMode = 'source' | 'rendered';
