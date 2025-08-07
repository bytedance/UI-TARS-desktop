# Tool Filtering

Filter tools to optimize agent performance and focus capabilities on specific tasks.

@agent-tars/core includes 32 built-in tools across 4 categories: **general** (1), **browser** (18), **filesystem** (11), and **commands** (2).

## Quick Start

```bash
# Include only browser tools (18 tools)
tarko --tool.include browser

# Include filesystem but exclude file editing
tarko --tool.include filesystem --tool.exclude edit_file

# Multiple categories
tarko --tool.include "browser,filesystem" --tool.exclude "run_command,run_script"
```

## CLI Options

| Option | Description | Example |
|--------|-------------|----------|
| `--tool.include <patterns>` | Include tools matching patterns | `--tool.include browser` |
| `--tool.exclude <patterns>` | Exclude tools matching patterns | `--tool.exclude delete` |

**Pattern Matching**: Uses substring matching for high performance.
**Execution Order**: Include filters applied first, then exclude filters.

## Programmatic Usage

### AgentOptions

```typescript
import { Agent } from '@tarko/agent';

const agent = new Agent({
  tool: {
    include: ['browser', 'filesystem'],
    exclude: ['browser-get-markdown', 'filesystem-delete']
  }
});
```

### Configuration File

```json
{
  "tool": {
    "include": ["browser", "filesystem"],
    "exclude": ["delete", "remove"]
  }
}
```

## Available Tool Categories

| Category | Count | Tools |
|----------|-------|-------|
| **general** | 1 | `web_search` |
| **browser** | 18 | `browser_click`, `browser_navigate`, `browser_screenshot`, etc. |
| **filesystem** | 11 | `read_file`, `write_file`, `edit_file`, `create_directory`, etc. |
| **commands** | 2 | `run_command`, `run_script` |

## Use Cases

### Web Automation Only
```bash
# Browser tools + web search (19 tools)
tarko --tool.include "browser,web_search"
```

### Safe File Operations
```bash
# Filesystem without command execution (11 tools)
tarko --tool.include filesystem --tool.exclude "run_command,run_script"
```

### Read-Only Agent
```bash
# No file writing or command execution
tarko --tool.exclude "write_file,edit_file,create_directory,move_file,run_command,run_script"
```

## Implementation Details

- **Performance**: O(n×m) complexity where n=tools, m=patterns
- **Matching**: Simple `string.includes()` for optimal speed
- **Logging**: Detailed filter operations logged for debugging
- **Compatibility**: Fully backward compatible

## Examples

### Browser-Only Agent
```bash
tarko --tool.include browser
# Result: 18 browser tools (browser_click, browser_navigate, etc.)
```

### File Operations Without Editing
```bash
tarko --tool.include filesystem --tool.exclude edit_file
# Result: 10 filesystem tools (read_file, write_file, list_directory, etc.)
```

### Specific Tool Exclusion
```bash
tarko --tool.include "browser,filesystem" --tool.exclude "browser_get_markdown,run_command"
# Result: 28 tools (17 browser + 11 filesystem, excluding markdown and commands)
```

### Minimal Agent (Read-Only)
```bash
tarko --tool.include "read_file,read_multiple_files,list_directory,browser_screenshot,web_search"
# Result: 5 essential read-only tools
```

## Troubleshooting

### No Tools Available
If no tools match your filters:
```bash
# Check what tools are available (32 total)
tarko --debug # Shows all registered tools

# Use broader include patterns
tarko --tool.exclude "run_command" # Exclude specific tools instead
```

### Pattern Not Working
- Patterns are case-sensitive (`browser` not `Browser`)
- Use exact tool names (`browser_click` not `click`)
- Categories work: `browser`, `filesystem`, `commands`, `general`

### Debug Filtering
```bash
# See which tools are filtered
tarko --debug --tool.include browser
# Output: "Applied include filter with patterns [browser], 18/32 tools matched"
```

## Complete Tool Reference

### 📦 general (1)
- `web_search` - Search the web

### 📦 browser (18)
- `browser_click` - Click on elements
- `browser_close_tab` - Close browser tab
- `browser_evaluate` - Execute JavaScript
- `browser_form_input_fill` - Fill form inputs
- `browser_get_clickable_elements` - Get clickable elements
- `browser_get_markdown` - Extract page content as markdown
- `browser_go_back` - Navigate back
- `browser_go_forward` - Navigate forward
- `browser_hover` - Hover over elements
- `browser_navigate` - Navigate to URL
- `browser_new_tab` - Open new tab
- `browser_press_key` - Press keyboard keys
- `browser_read_links` - Extract all links
- `browser_screenshot` - Take screenshots
- `browser_scroll` - Scroll page
- `browser_select` - Select dropdown options
- `browser_switch_tab` - Switch between tabs
- `browser_tab_list` - List all open tabs

### 📦 filesystem (11)
- `create_directory` - Create directories
- `directory_tree` - Get directory structure
- `edit_file` - Edit existing files
- `get_file_info` - Get file metadata
- `list_allowed_directories` - List accessible directories
- `list_directory` - List directory contents
- `move_file` - Move/rename files
- `read_file` - Read file contents
- `read_multiple_files` - Read multiple files
- `search_files` - Search for files
- `write_file` - Write file contents

### 📦 commands (2)
- `run_command` - Execute shell commands
- `run_script` - Run scripts with interpreters
