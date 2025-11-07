# @gui-agent/cli

CLI for GUI Agent - A powerful automation tool for desktop, web, and mobile applications.

## Installation

### Global Installation
```bash
npm install -g @gui-agent/cli
```

### Use via npx (without installation)
```bash
npx @gui-agent/cli start [options]
```

### Local Installation
```bash
npm install @gui-agent/cli
```

## Usage

### Basic Usage

```bash
gui-agent start
```

This will start an interactive prompt where you can:
1. Configure your VLM model settings (provider, base URL, API key, model name)
2. Select the target operator (desktop or mobile)
3. Enter your automation instruction

### Available Commands

#### `gui-agent start`
Start GUI Agent automation with optional parameters.

#### `gui-agent reset`
Reset stored configuration (API keys, model settings, etc.).
```bash
gui-agent reset                    # Reset default configuration file
gui-agent reset -c custom.json     # Reset specific configuration file
```

### Command Line Options

```bash
gui-agent start [options]
```

#### Options:
- `-p, --presets <url>` - Load model configuration from a remote YAML preset file
- `-t, --target <target>` - Specify the target operator:
  - `nut-js` - Desktop automation (default)
  - `adb` - Android mobile automation
- `-q, --query <query>` - Provide the automation instruction directly via command line
- `-c, --config <path>` - Path to a custom configuration file (default: `~/.gui-agent-cli.json`)

### Examples

#### Desktop Automation (nut-js)
```bash
gui-agent start -t nut-js -q "Open Chrome browser and navigate to github.com"
```

#### Android Mobile Automation (adb)
Make sure your Android device is connected via USB debugging:

```bash
gui-agent start -t adb -q "Open WhatsApp and send a message to John"
```

### Examples

#### Reset Configuration
```bash
gui-agent reset                    # Reset all stored configuration
gui-agent reset -c custom.json     # Reset specific configuration file
```

#### Desktop Automation (nut-js)

#### Using Remote Presets
```bash
gui-agent start -p "https://example.com/config.yaml" -q "Automate the login process"
```

## Configuration

### Model Configuration

The CLI requires VLM (Vision Language Model) configuration. You can provide this via:

1. **Interactive setup** - When you first run the CLI, it will prompt for:
   - Model provider (volcengine, anthropic, openai, lm-studio, deepseek, ollama)
   - Model base URL
   - API key
   - Model name

2. **Configuration file** - Settings are saved to `~/.gui-agent-cli.json`:
   ```json
   {
     "provider": "openai",
     "baseURL": "https://api.openai.com/v1",
     "apiKey": "your-api-key",
     "model": "gpt-4-vision-preview",
     "useResponsesApi": false
   }
   ```

3. **Remote presets** - Load configuration from a YAML file:
   ```yaml
   vlmBaseUrl: "https://api.openai.com/v1"
   vlmApiKey: "your-api-key"
   vlmModelName: "gpt-4-vision-preview"
   useResponsesApi: false
   ```

#### Supported Providers
- **volcengine** - VolcEngine (ByteDance) models
- **anthropic** - Anthropic Claude models
- **openai** - OpenAI models (default)
- **lm-studio** - LM Studio local models
- **deepseek** - DeepSeek models
- **ollama** - Ollama local models

## Operators

### Desktop Automation (nut-js)
- Automates desktop applications
- Uses computer vision to identify UI elements
- Supports mouse and keyboard actions
- Works with Windows, macOS, and Linux

### Android Automation (adb)
- Controls Android devices via ADB
- Requires USB debugging enabled
- Can automate mobile apps and system UI
- Supports touch gestures and device interactions

## Configuration Management

### Reset Configuration
To clear all stored configuration and start fresh:
```bash
gui-agent reset
```

This will remove the configuration file (`~/.gui-agent-cli.json`) and the CLI will prompt you to configure settings again on the next run.

### Custom Configuration File
You can specify a custom configuration file location:
```bash
gui-agent start -c /path/to/custom-config.json
```

To reset a specific configuration file:
```bash
gui-agent reset -c /path/to/custom-config.json
```

## Development

### Building the CLI
```bash
npm run build
```

### Development Mode
```bash
npm run dev
```

### Running Tests
```bash
npm test
```

## License

Apache-2.0

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our repository.