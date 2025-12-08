/**
 * Git commit utilities
 */

/**
 * Extract scope from conventional commit message
 * @param commitMessage - The commit message to extract scope from
 * @returns The extracted scope or empty string if no scope found
 */
export function extractScopeFromCommit(commitMessage: string): string {
  const match = commitMessage.match(/^(\w+)(\([^)]+\))?:\s*(.+)$/);
  if (!match) {
    return '';
  }

  const [, , scopeStr] = match;
  
  if (!scopeStr) {
    return '';
  }

  const scopeMatch = scopeStr.match(/^\(([^)]+)\)$/);
  return scopeMatch ? scopeMatch[1] : '';
}

/**
 * Check if a commit should be included based on scope filters
 * @param commitMessage - The commit message to check
 * @param filterScopes - Array of scopes to include (empty array means include all)
 * @returns True if the commit should be included
 */
export function shouldIncludeCommitByScope(
  commitMessage: string,
  filterScopes?: string[],
): boolean {
  // If no filter provided, include all commits
  if (!filterScopes || filterScopes.length === 0) {
    return true;
  }

  const scope = extractScopeFromCommit(commitMessage);
  
  // Include if no scope or scope matches filter
  return !scope || filterScopes.includes(scope) || filterScopes.includes('all');
}