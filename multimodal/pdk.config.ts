import { defineConfig } from 'pnpm-dev-kit';

export default defineConfig({
  // Release defaults for multimodal workspace
  pushTag: true,
  build: true,
  ignoreScripts: true,
  autoCreateReleaseBranch: true,
  
  // Scope filtering for changelog
  filterScopes: ['tars', 'agent', 'tarko', 'o-agent', 'tars-stack', 'browser', 'infra', 'mcp', 'all'],
  
  // AI changelog configuration (opt-in)
  provider: 'azure-openai',
  model: 'aws_sdk_claude37_sonnet',
  baseURL: process.env.AWS_CLAUDE_API_BASE_URL,
});