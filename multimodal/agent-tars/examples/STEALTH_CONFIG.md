# Puppeteer Stealth 配置指南

## 通过配置文件设置 Stealth

`--browser.stealth` 选项可以通过配置文件指定，支持 JSON、YAML、TypeScript 等格式。

### 1. JSON 配置文件

创建 `agent-tars.config.json`:

```json
{
  "browser": {
    "stealth": true  // 启用 stealth（默认值）
  }
}
```

### 2. YAML 配置文件

创建 `agent-tars.config.yml`:

```yaml
browser:
  stealth: true  # 启用 stealth
  # stealth: false  # 禁用 stealth
```

### 3. TypeScript 配置文件

创建 `agent-tars.config.ts`:

```typescript
import { defineConfig } from '@agent-tars/interface';

export default defineConfig({
  browser: {
    stealth: true,  // 启用 stealth
  },
});
```

### 4. 使用配置文件

```bash
# 使用本地配置文件
agent-tars --config ./agent-tars.config.json

# 使用多个配置文件（后面的覆盖前面的）
agent-tars --config ./base.json --config ./override.json

# 使用远程配置文件
agent-tars --config https://example.com/config.json
```

### 5. 配置优先级

配置的优先级从低到高：

1. 默认值（stealth: true）
2. 配置文件中的设置
3. 命令行参数

例如：

```bash
# 配置文件中 stealth: true，但命令行禁用它
agent-tars --config ./config.json --no-browser.stealth

# 最终结果：stealth 被禁用
```

### 6. 完整配置示例

```json
{
  "model": {
    "provider": "volcengine",
    "id": "doubao-1-5-thinking-vision-pro-250428",
    "apiKey": "your-api-key"
  },
  "browser": {
    "type": "local",
    "headless": false,
    "control": "hybrid",
    "stealth": true,
    "cdpEndpoint": null
  },
  "workspace": {
    "workingDirectory": "./workspace"
  },
  "logLevel": "info",
  "stream": true
}
```

### 7. 环境特定配置

使用 TypeScript 配置文件可以根据环境动态设置：

```typescript
import { defineConfig } from '@agent-tars/interface';

export default defineConfig({
  browser: {
    // 生产环境启用 stealth，开发环境禁用
    stealth: process.env.NODE_ENV === 'production',
  },
});
```

### 8. 验证 Stealth 是否生效

运行时会在日志中显示：

```
[LocalBrowser] Stealth mode: enabled
# 或
[LocalBrowser] Stealth mode: disabled
```

您也可以访问 https://bot.sannysoft.com/ 来验证 stealth 是否生效。