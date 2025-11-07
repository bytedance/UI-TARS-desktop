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
1. Configure your VLM model settings
2. Select the target operator (desktop, web, or mobile)
3. Enter your automation instruction

### Command Line Options

```bash
gui-agent start [options]
```

#### Options:
- `-p, --presets <url>` - Load model configuration from a remote YAML preset file
- `-t, --target <target>` - Specify the target operator:
  - `nut-js` - Desktop automation (default)
  - `adb` - Android mobile automation
  - `browser` - Web browser automation
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

#### Web Browser Automation
```bash
gui-agent start -t browser -q "Search for 'GUI Agent automation' on Google"
```

#### Using Remote Presets
```bash
gui-agent start -p "https://example.com/config.yaml" -q "Automate the login process"
```

## Configuration

### Model Configuration

The CLI requires VLM (Vision Language Model) configuration. You can provide this via:

1. **Interactive setup** - When you first run the CLI, it will prompt for:
   - Model base URL
   - API key
   - Model name

2. **Configuration file** - Settings are saved to `~/.gui-agent-cli.json`:
   ```json
   {
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

### Browser Automation (browser)
- Automates web browsers
- Can control Chrome, Firefox, etc.
- Supports web form filling and navigation
- Handles dynamic web content

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