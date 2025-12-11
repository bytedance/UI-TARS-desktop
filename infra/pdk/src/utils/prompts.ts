export interface PromptCommit {
  hash: string;
  author: string;
  date: string;
  message: string;
  prNumber?: string;
}

export function buildChangelogPrompt(commits: PromptCommit[]): string {
  const header = 'Analyze these git commits and generate a structured changelog:';
  const guide = [
    'Group similar commits into sections (e.g., Features, Bug Fixes, etc.).',
    'If there are major architectural or breaking changes, highlight them in a summary.',
    'Return concise professional JSON with keys: sections[], summary.',
  ].join('\n');

  const schema = `{
  "sections": [
    {
      "type": "feat",
      "title": "Features",
      "commits": [
        {
          "message": "Clear description of the change",
          "hash": "commit hash",
          "prNumber": "PR number if available"
        }
      ]
    }
  ],
  "summary": "Optional overall summary"
}`;

  return [
    header,
    '',
    JSON.stringify(commits, null, 2),
    '',
    guide,
    'Provide output matching this shape:',
    schema,
  ].join('\n');
}
