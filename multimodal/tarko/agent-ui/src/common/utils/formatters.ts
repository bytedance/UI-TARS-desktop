/**
 * Format a timestamp to a user-friendly date string
 * Handles null/undefined timestamps by using current time as fallback
 */
export const formatTimestamp = (timestamp: number | null | undefined, compact = false): string => {
  const validTimestamp = timestamp ?? Date.now();
  const now = Date.now();
  const diff = now - validTimestamp;
  const date = new Date(validTimestamp);

  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/**
 * Format a date relative to today (Today, Yesterday, or date)
 */
export function formatRelativeDate(timestamp: number): string {
  const date = new Date(timestamp);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}
