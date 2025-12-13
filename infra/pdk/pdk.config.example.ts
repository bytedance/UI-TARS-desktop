import { defineConfig } from './src/index';

/**
 * PDK Configuration Example
 * 
 * CONFIGURATION DESIGN PRINCIPLES:
 * 
 * 🎯 CONFIG FILE IS FOR:
 * ✅ Project conventions and team standards
 * ✅ Workflow defaults and preferences
 * ✅ AI configuration and model choices
 * ✅ Filtering rules for changelogs
 * ✅ Build and deployment settings
 * 
 * ⚠️ USE CLI INSTEAD FOR:
 * 🔒 Sensitive data (API keys, tokens)
 * 🌍 Environment-specific values
 * 🧪 Temporary testing flags (dry-run)
 * 📦 One-time package selections
 * 🏷️ Specific version overrides
 * 
 * 💡 BEST PRACTICES:
 * • Use environment variables for API keys: process.env.OPENAI_API_KEY
 * • Keep config in version control for team consistency
 * • Review config changes in pull requests
 * • Document configuration decisions in team wiki
 */
export default defineConfig({
  // =============================================================================
  // PROJECT-LEVEL SETTINGS (Perfect for config file)
  // =============================================================================
  
  // Git tag convention for your project
  tagPrefix: 'v',              // 'v' for v1.0.0, 'release-' for release-1.0.0
  
  // Resource constraints for your environment
  runInBand: false,            // true for CI/CD with limited resources
  ignoreScripts: false,         // true if you want to skip build scripts
  
  // =============================================================================
  // AI CONFIGURATION (Perfect for config file)
  // =============================================================================
  
  // Team's AI preferences for changelog generation
  useAi: true,                // Enable AI-powered changelogs
  model: 'gpt-4o',            // Team's preferred LLM model
  provider: 'openai',          // Team's AI provider
  baseURL: 'https://api.openai.com/v1',  // Custom endpoint for enterprise
  
  // IMPORTANT: Never put API keys in config files!
  // Use environment variables instead:
  // apiKey: process.env.OPENAI_API_KEY,
  
  // =============================================================================
  // CHANGELOG FILTERING (Perfect for config file)
  // =============================================================================
  
  // Your project's commit type standards
  filterTypes: ['feat', 'fix', 'perf'],  // Types to include in changelogs
  
  // Your project's scope organization
  filterScopes: ['core', 'ui', 'api'],   // Scopes to focus on
  
  // =============================================================================
  // WORKFLOW DEFAULTS (Perfect for config file)
  // =============================================================================
  
  // Release workflow preferences
  changelog: true,             // Always generate changelog on releases
  pushTag: true,              // Auto-push git tags to remote
  createGithubRelease: true,     // Auto-create GitHub releases
  autoCreateReleaseBranch: false, // Manual release branch creation
  build: true,                // Run build script before publishing
  canary: false,              // Canary releases via CLI flag only
  
  // Changelog generation preferences
  beautify: true,              // Format changelog with markdown enhancements
  commit: true,                // Commit changelog to git
  gitPush: false,              // Don't auto-push changelog commits
  attachAuthor: true,           // Include author information
  authorNameType: 'name',       // Use author names (vs emails)
  
  // =============================================================================
  // ⚠️  CLI-PREFERRED OPTIONS (Keep in config for defaults only)
  // =============================================================================
  
  // These are better controlled via CLI for flexibility:
  // dryRun: false,           // Use --dry-run for testing
  // cwd: process.cwd(),       // Use --cwd for different directories
  // version: undefined,       // Use --version for specific releases
  // exclude: [],             // Use --exclude for temporary exclusions
  // packages: [],            // Use --packages for specific selection
  
  // Patch command defaults (rarely need customization)
  tag: 'latest',              // Default NPM distribution tag
});