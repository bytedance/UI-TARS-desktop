import { parseCommit } from 'tiny-conventional-commits-parser';

/**
 * Git commit utilities
 */

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

  // Parse the commit using tiny-conventional-commits-parser
  const rawCommit = {
    message: commitMessage,
    body: '',
    shortHash: '',
    author: { name: '', email: '' },
    data: '',
  };

  try {
    const parsedCommit = parseCommit(rawCommit);
    const scope = parsedCommit.scope;

    // Include if no scope or scope matches filter
    return (
      !scope || filterScopes.includes(scope) || filterScopes.includes('all')
    );
  } catch {
    // If parsing fails, include the commit
    return true;
  }
}
