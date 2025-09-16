/**
 * Parse focus parameter from URL
 */
export function getFocusParam(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('focus');
}

/**
 * Parse URL parameters for replay configuration
 */
export function shouldAutoPlay(): boolean {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('replay') === '1';
}
