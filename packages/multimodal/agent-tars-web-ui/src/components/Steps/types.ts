/**
 * Represents a single step in a multi-step process
 */
export interface Step {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
}

/**
 * Props for the Steps component
 */
export interface StepsProps {
  /**
   * Array of step objects to display
   */
  steps: Step[];

  /**
   * Whether the steps details are expanded or collapsed
   */
  expanded: boolean;

  /**
   * Callback when expand/collapse toggle is clicked
   */
  onToggleExpand: () => void;

  /**
   * Callback when a step status is updated
   */
  onUpdateStatus: (id: number, status: Step['status']) => void;

  /**
   * Whether to use dark mode styling
   */
  darkMode: boolean;
}

/**
 * Props for an individual step item
 */
export interface StepItemProps {
  /**
   * The step object to display
   */
  step: Step;

  /**
   * Whether this is the last step in the list
   */
  isLast: boolean;

  /**
   * Callback when step status is updated
   */
  onUpdateStatus: (id: number, status: Step['status']) => void;

  /**
   * Animation sequence index
   */
  custom: number;

  /**
   * Whether to use dark mode styling
   */
  darkMode: boolean;
}
