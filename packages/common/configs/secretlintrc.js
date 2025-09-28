export const rules = [
  { id: '@secretlint/secretlint-rule-1password' },
  { id: '@secretlint/secretlint-rule-anthropic' },
  { id: '@secretlint/secretlint-rule-aws' },
  { id: '@secretlint/secretlint-rule-azure' },
  { id: '@secretlint/secretlint-rule-basicauth' },
  { id: '@secretlint/secretlint-rule-database-connection-string' },
  { id: '@secretlint/secretlint-rule-filter-comments' },
  { id: '@secretlint/secretlint-rule-gcp' },
  { id: '@secretlint/secretlint-rule-github' },
  { id: '@secretlint/secretlint-rule-no-dotenv' },
  { id: '@secretlint/secretlint-rule-no-homedir' },
  { id: '@secretlint/secretlint-rule-no-k8s-kind-secret' },
  {
    id: '@secretlint/secretlint-rule-npm',
    options: {
      allows: [String.raw`/npm_i_save_dev_types_/g`],
    },
  },
  { id: '@secretlint/secretlint-rule-openai' },
  {
    id: '@secretlint/secretlint-rule-pattern',
    options: {
      patterns: [
        {
          name: 'key-value secret',
          pattern: String.raw`/\b(?<key>(?:password|pass|secret|token|apiKey)(?:[_-]\w+)?)\b\s*[:=]\s*(?<value>(?!['"]?\s*['"]?$)(?!\d+\.\d+(?:\.\d+)?(?:\s|$))\S.*)/i`,
        },
      ],
      allows: ['your_api_key', 'YOUR_API_KEY'],
    },
  },
  { id: '@secretlint/secretlint-rule-privatekey' },
];
