# GUI Agent Standalone Project - Quick Start for LLM Agents

## PROJECT OVERVIEW
- **Project Type**: TypeScript Node.js application using GUI Agent SDK
- **Module System**: CommonJS (NOT ES Modules)
- **Build Tool**: TypeScript Compiler (tsc)
- **Package Manager**: npm/pnpm
- **Runtime**: Node.js v22.17.1+

## CRITICAL TECHNICAL CONSTRAINTS

### 1. MODULE SYSTEM REQUIREMENTS
- **MUST USE CommonJS**: `package.json` does NOT contain `"type": "module"`
- **TypeScript Config**: `"module": "CommonJS"` in `tsconfig.json`
- **Import Syntax**: Use ES6 imports in TypeScript, compiles to CommonJS require()
- **File Extensions**: NO `.js` extensions needed in TypeScript imports
- **__dirname**: Available in CommonJS (NOT available in ES modules)

### 2. TYPE SYSTEM CONSTRAINTS
- **Avoid Type Imports**: Do NOT import `ModelProviderName` or `AgentModel` types
- **Use `as const` Assertion**: For string literals that need specific types
- **Example**: `provider: 'volcengine' as const` (NOT `provider: 'volcengine'`)
- **Reason**: Prevents string type widening, ensures literal type compatibility

### 3. ENVIRONMENT CONFIGURATION
- **File**: `.env.local` (copy from `.env.local.example`)
- **Loading**: Uses `dotenv` with `path.join(__dirname, '..', '.env.local')`

#### Required Environment Variables
```bash
# Model Service Configuration
ARK_BASE_URL=https://your-model-service-url         # Model Service API endpoint
ARK_API_KEY=your-actual-model-service-api-key       # Your Model Service API key

# Doubao Models Configuration  
DOUBAO_1_5_VP=your-model-key-abcdef                 # Doubao 1.5 VP model endpoint ID
DOUBAO_SEED_1_6=your-model-key-fedcba               # Doubao Seed 1.6 model endpoint ID

# AIO Sandbox Configuration
SANDBOX_URL=http://your-sandbox-url:port            # AIO operator sandbox URL
```

#### Environment Variable Details
- **ARK_BASE_URL**: Model service base URL
- **ARK_API_KEY**: Your Volcengine account API key for authentication
- **DOUBAO_SEED_1_6**: Model endpoint ID for Doubao Seed 1.6, format: `ep-{timestamp}-{hash}`
- **DOUBAO_1_5_VP**: Model endpoint ID for Doubao 1.5 VP (optional, not used in current code)
- **SANDBOX_URL**: URL of the AIO operator sandbox environment for GUI operations

#### Environment Setup Process
1. Copy `.env.local.example` to `.env.local`
2. Replace all `your-*` placeholders with actual values
3. Ensure ARK_API_KEY has proper permissions for model access
4. Verify SANDBOX_URL is accessible and running
5. Model endpoint IDs must be valid and active in your Volcengine account

## PROJECT STRUCTURE
```
gui-agent-standalone/
├── src/
│   ├── index.ts          # Main entry point
│   └── constants.ts      # System prompt definition
├── dist/                 # Compiled JavaScript output
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── .env.local.example    # Environment template
└── .env.local           # Actual environment (create manually)
```

## DEPENDENCIES
### Runtime Dependencies
- `dotenv`: Environment variable loading
- `@gui-agent/agent-sdk`: Core GUI agent functionality
- `@gui-agent/operator-aio`: AIO hybrid operator
- `@gui-agent/action-parser`: Action parsing utilities

### Development Dependencies
- `typescript`: TypeScript compiler
- `tsx`: TypeScript execution for development
- `@types/node`: Node.js type definitions

## BUILD AND RUN PROCESS

### 1. MANDATORY BUILD STEP
```bash
npm run build  # Compiles TypeScript to dist/
```
- **NEVER skip this step** - project requires compilation
- **Output**: `dist/index.js` and `dist/constants.js`

### 2. EXECUTION
```bash
npm start      # Runs compiled JavaScript
# OR for development
npm run dev    # Direct TypeScript execution
```

## CODE STRUCTURE PATTERNS

### 1. Model Configuration
```typescript
const doubao = {
    id: process.env.DOUBAO_SEED_1_6!,
    provider: 'volcengine' as const,  // CRITICAL: as const assertion
    baseURL: process.env.ARK_BASE_URL!,
    apiKey: process.env.ARK_API_KEY!,
};
```

### 2. Operator Setup
```typescript
const operator = new AIOHybridOperator({
    baseURL: process.env.SANDBOX_URL!,
    timeout: 10000,
});
```

### 3. Agent Initialization
```typescript
const guiAgent = new GUIAgent({
    operator,
    model: doubao,  // No type assertion needed with as const
    systemPrompt: SYSTEM_PROMPT,
});
```

### 4. Execution Pattern
```typescript
async function main() {
    const response = await guiAgent.run({
        input: [{ type: 'text', text: 'your-task-here' }],
    });
    console.log(response.content);
}
```

## COMMON ISSUES AND SOLUTIONS

### Issue 1: ERR_MODULE_NOT_FOUND
- **Cause**: Missing build step or ES module configuration
- **Solution**: Run `npm run build` first, ensure CommonJS config

### Issue 2: Type Assignment Error
- **Error**: Cannot assign string to ModelProviderName
- **Solution**: Use `as const` assertion on provider field
- **Wrong**: `provider: 'volcengine'`
- **Correct**: `provider: 'volcengine' as const`

### Issue 3: __dirname Not Defined
- **Cause**: ES module configuration
- **Solution**: Remove `"type": "module"` from package.json

### Issue 4: Environment Variables Not Loaded
- **Cause**: Missing .env.local file
- **Solution**: Copy .env.local.example to .env.local and fill values

## TYPESCRIPT CONFIGURATION DETAILS

### tsconfig.json Requirements
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",           // CRITICAL: Must be CommonJS
    "moduleResolution": "node",     // CRITICAL: Must be node
    "outDir": "./dist",
    "rootDir": "./src",
    "esModuleInterop": true,
    "strict": true
  }
}
```

### package.json Requirements
```json
{
  "main": "dist/index.js",
  // NO "type": "module" field
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts",
    "clean": "rm -rf dist"
  }
}
```

## SYSTEM PROMPT CONFIGURATION
- **Location**: `src/constants.ts`
- **Export**: `SYSTEM_PROMPT` constant
- **Content**: GUI agent instructions with action space definitions

### Complete SYSTEM_PROMPT Content
```typescript
export const SYSTEM_PROMPT = `
You are a GUI agent. You are given a task and your action history, with screenshots. You need to perform the next action to complete the task.

## Output Format
\`\`\`
Thought: ...
Action: ...
\`\`\`

## Action Space

navigate(url='xxx') # The url to navigate to
navigate_back() # Navigate back to the previous page.
click(point='<point>x1 y1</point>')
left_double(point='<point>x1 y1</point>')
right_single(point='<point>x1 y1</point>')
drag(start_point='<point>x1 y1</point>', end_point='<point>x2 y2</point>')
hotkey(key='ctrl c') # Split keys with a space and use lowercase. Also, do not use more than 3 keys in one hotkey action.
type(content='xxx') # Use escape characters \\', \\", and \\n in content part to ensure we can parse the content in normal python string format. If you want to submit your input, use \\n at the end of content. 
scroll(point='<point>x1 y1</point>', direction='down or up or right or left') # Show more information on the \`direction\` side.
wait() #Sleep for 5s and take a screenshot to check for any changes.
finished(content='xxx') # Use escape characters \\', \\", and \\n in content part to ensure we can parse the content in normal python string format.

## Note
- Use Chinese in \`Thought\` part.
- Write a small plan and finally summarize your next action (with its target element) in one sentence in \`Thought\` part.

## User Instruction
`;
```

### Action Space Details
- **navigate(url)**: Navigate to specified URL
- **navigate_back()**: Go back to previous page
- **click(point)**: Single left click at coordinates
- **left_double(point)**: Double left click at coordinates  
- **right_single(point)**: Single right click at coordinates
- **drag(start_point, end_point)**: Drag from start to end coordinates
- **hotkey(key)**: Execute keyboard shortcuts (max 3 keys, space-separated, lowercase)
- **type(content)**: Type text content (use escape characters for special chars)
- **scroll(point, direction)**: Scroll in specified direction at coordinates
- **wait()**: Wait 5 seconds and take screenshot
- **finished(content)**: Mark task completion with result content

### Content Formatting Rules
- **Escape Characters**: Use `\'`, `\"`, `\n` for special characters
- **Line Breaks**: Use `\n` for new lines
- **Submission**: End with `\n` to submit input
- **Action Summary**: One sentence summary of next action in Thought section

## DEVELOPMENT WORKFLOW
1. **Setup**: Copy `.env.local.example` to `.env.local`
2. **Install**: `npm install`
3. **Build**: `npm run build` (MANDATORY)
4. **Run**: `npm start`
5. **Development**: `npm run dev` (skips build)
6. **Clean**: `npm run clean` (removes dist/)

## AGENT EXECUTION FLOW
1. **Environment Loading**: Load variables from `.env.local` using dotenv
2. **Model Configuration**: Initialize with proper type assertions (`as const`)
3. **Operator Setup**: Create AIO operator with sandbox URL and timeout
4. **Agent Initialization**: Combine operator, model, and system prompt
5. **Task Execution**: Run agent with structured input format
6. **Response Processing**: Handle and display agent output

### Detailed Execution Steps
```typescript
// 1. Environment Loading
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// 2. Model Configuration with Type Safety
const doubao = {
    id: process.env.DOUBAO_SEED_1_6!,
    provider: 'volcengine' as const,  // Critical: literal type
    baseURL: process.env.ARK_BASE_URL!,
    apiKey: process.env.ARK_API_KEY!,
};

// 3. Operator Setup
const operator = new AIOHybridOperator({
    baseURL: process.env.SANDBOX_URL!,
    timeout: 10000,  // 10 second timeout
});

// 4. Agent Initialization
const guiAgent = new GUIAgent({
    operator,
    model: doubao,
    systemPrompt: SYSTEM_PROMPT,
});

// 5. Task Execution
const response = await guiAgent.run({
    input: [{ type: 'text', text: 'your task description' }],
});

// 6. Response Processing
console.log('Agent Response:', response.content);
```

### Input Format Requirements
- **Structure**: Array of input objects
- **Type**: Must be `'text'` for text inputs
- **Content**: Task description in natural language
- **Example**: `[{ type: 'text', text: '打开百度搜索页面并搜索TypeScript教程' }]`

### Response Format
- **Type**: Object with content property
- **Content**: Agent's response including thoughts and actions
- **Format**: Follows SYSTEM_PROMPT output format (Thought + Action)
- **Language**: Chinese thoughts, English actions

## CRITICAL SUCCESS FACTORS
- **Always build before running production**: `npm run build` is mandatory
- **Use `as const` for string literals requiring specific types**: Prevents type widening
- **Maintain CommonJS module system**: Never add `"type": "module"` to package.json
- **Ensure all environment variables are set**: Missing vars cause runtime failures
- **Never import type-only dependencies in runtime code**: Causes compilation errors
- **Verify sandbox connectivity**: SANDBOX_URL must be accessible and responsive
- **Use correct model endpoint IDs**: Invalid IDs cause API authentication failures
- **Follow point coordinate format**: `<point>x y</point>` format is strictly required
- **Escape special characters in content**: Use `\'`, `\"`, `\n` for proper parsing
- **Chinese thoughts, English actions**: Language requirements are enforced by system prompt

## TROUBLESHOOTING GUIDE

### Build Issues
- **Error**: `Cannot find module './constants'`
  - **Cause**: Missing build step or incorrect module resolution
  - **Solution**: Run `npm run build` and verify tsconfig.json settings

- **Error**: `Cannot assign string to ModelProviderName`
  - **Cause**: Missing `as const` assertion on provider field
  - **Solution**: Add `as const` to provider: `provider: 'volcengine' as const`

### Runtime Issues
- **Error**: `ARK_API_KEY is not defined`
  - **Cause**: Missing or incorrect .env.local file
  - **Solution**: Copy .env.local.example and fill actual values

- **Error**: `Connection refused to SANDBOX_URL`
  - **Cause**: AIO sandbox not running or incorrect URL
  - **Solution**: Verify sandbox is accessible at specified URL

- **Error**: `Model endpoint not found`
  - **Cause**: Invalid DOUBAO_SEED_1_6 endpoint ID
  - **Solution**: Check Volcengine console for correct endpoint ID

### Agent Execution Issues
- **Error**: `Invalid action format`
  - **Cause**: Incorrect point coordinates or action syntax
  - **Solution**: Follow `<point>x y</point>` format and action space definitions

- **Error**: `Timeout waiting for response`
  - **Cause**: Network issues or model overload
  - **Solution**: Increase timeout in operator configuration or retry

## PERFORMANCE OPTIMIZATION
- **Build Time**: Use `npm run dev` for development (skips build)
- **Model Response**: Adjust timeout based on task complexity
- **Memory Usage**: Clean dist/ folder regularly with `npm run clean`
- **Network**: Ensure stable connection to ARK and sandbox services