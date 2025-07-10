# 浏览器持久化配置功能 - 需求与技术方案设计文档

## 1. 功能背景

在当前的 UI-TARS Desktop 应用中，Local Browser 操作器每次启动都会创建一个全新的浏览器实例，不会保存任何用户数据（如 cookies、localStorage、登录状态等）。这导致用户每次使用时都需要重新登录网站，影响了用户体验和自动化效率。

## 2. 需求描述

### 2.1 功能目标

为 Local Browser 操作器添加持久化浏览器配置功能，允许用户选择是否保存浏览器数据（cookies、localStorage、登录状态等）在会话之间。

### 2.2 用户故事

- 作为用户，我希望能够选择是否保存浏览器数据，以便下次使用时无需重新登录
- 作为用户，我希望这个功能是可选的，默认关闭以保护隐私
- 作为用户，我希望浏览器数据安全地存储在本地，不会泄露隐私信息

### 2.3 功能要求

1. **可选功能**：用户可以在设置中开启或关闭此功能
2. **默认关闭**：为了保护用户隐私，该功能默认处于关闭状态
3. **数据持久化**：保存以下浏览器数据：
   - Cookies
   - LocalStorage
   - SessionStorage
   - IndexedDB
   - 登录状态和会话信息
4. **跨平台支持**：支持 Windows、macOS 和 Linux 平台
5. **数据隔离**：浏览器配置数据与其他应用数据隔离存储

## 3. 技术方案设计

### 3.1 架构设计

#### 3.1.1 数据流程

```
用户界面（Settings）
    ↓
设置存储（Store）
    ↓
Agent 运行器（runAgent）
    ↓
浏览器操作器（BrowserOperator）
    ↓
Puppeteer 浏览器实例
```

#### 3.1.2 存储位置

根据不同操作系统，浏览器配置文件存储在以下位置：

- **Windows**: `%APPDATA%/ui-tars-desktop/browser-profiles/local-browser/`
- **macOS**: `~/Library/Application Support/ui-tars-desktop/browser-profiles/local-browser/`
- **Linux**: `~/.config/ui-tars-desktop/browser-profiles/local-browser/`

### 3.2 实现细节

#### 3.2.1 设置存储层

1. **新增配置项**
   - 在 `LocalStore` 类型中添加 `enablePersistentProfile: boolean` 字段
   - 默认值设置为 `false`

2. **验证模式**
   - 在 `PresetSchema` 中添加对应的验证规则

#### 3.2.2 用户界面层

1. **设置页面**
   - 在 Local Browser 设置页面添加一个复选框
   - 标题："Enable persistent browser profile"
   - 说明："Save browser data (cookies, localStorage, login states) between sessions"

2. **UI 组件**
   - 使用 Checkbox 组件实现开关功能
   - 实时保存设置变更

#### 3.2.3 浏览器操作器层

1. **获取应用数据目录**
   ```typescript
   private static getAppDataDir(): string {
     // 根据操作系统返回相应的应用数据目录
   }
   ```

2. **配置持久化目录**
   ```typescript
   if (enablePersistentProfile) {
     const userDataDir = path.join(
       appDataDir,
       'ui-tars-desktop',
       'browser-profiles',
       'local-browser'
     );
     launchOptions.userDataDir = userDataDir;
   }
   ```

3. **目录创建**
   - 使用 `fs.promises.mkdir` 递归创建目录
   - 确保目录权限正确（仅当前用户可访问）

### 3.3 代码变更清单

1. **apps/ui-tars/src/main/store/setting.ts**
   - 添加 `enablePersistentProfile: false` 到默认设置

2. **apps/ui-tars/src/main/store/validate.ts**
   - 添加 `enablePersistentProfile: z.boolean().optional()` 到验证模式

3. **apps/ui-tars/src/main/services/runAgent.ts**
   - 传递 `settings.enablePersistentProfile` 参数到浏览器操作器

4. **apps/ui-tars/src/renderer/src/components/Settings/category/localBrowser.tsx**
   - 添加持久化配置的 UI 控件
   - 实现设置的实时保存

5. **packages/ui-tars/operators/browser-operator/src/browser-operator.ts**
   - 实现 `getAppDataDir()` 方法获取平台特定的应用数据目录
   - 在 `getInstance()` 方法中处理持久化配置逻辑
   - 创建和管理用户数据目录

### 3.4 安全考虑

1. **数据隔离**
   - 浏览器配置数据存储在用户特定的应用数据目录中
   - 确保只有当前用户有访问权限

2. **隐私保护**
   - 功能默认关闭，需要用户主动开启
   - 在 UI 中明确告知用户数据将被保存

3. **数据清理**
   - 未来可以考虑添加清理浏览器数据的功能
   - 在卸载应用时清理相关数据

### 3.5 测试计划

1. **功能测试**
   - 验证设置开关正常工作
   - 验证浏览器数据在会话间持久化
   - 验证默认情况下不保存数据

2. **跨平台测试**
   - 在 Windows、macOS、Linux 上测试目录创建
   - 验证数据存储位置正确

3. **边界测试**
   - 目录权限不足时的处理
   - 磁盘空间不足时的处理

## 4. 实施计划

### 4.1 开发阶段

1. **第一阶段**：后端实现（1天）
   - 实现存储层和浏览器操作器的改动
   - 添加必要的日志记录

2. **第二阶段**：前端实现（0.5天）
   - 实现设置页面的 UI 改动
   - 集成前后端逻辑

3. **第三阶段**：测试和优化（0.5天）
   - 执行测试计划
   - 修复发现的问题

### 4.2 发布计划

- 作为次要功能在下一个版本中发布
- 在发布说明中明确说明此功能及其隐私影响

## 5. 未来扩展

1. **数据管理功能**
   - 添加清理浏览器数据的选项
   - 添加导入/导出浏览器配置的功能

2. **多配置文件支持**
   - 允许用户创建多个浏览器配置文件
   - 支持在不同配置文件间切换

3. **加密存储**
   - 对敏感数据进行加密存储
   - 支持主密码保护

## 6. 风险与缓解措施

1. **隐私风险**
   - 风险：用户数据可能被意外暴露
   - 缓解：默认关闭功能，明确提示用户

2. **存储空间**
   - 风险：浏览器数据可能占用大量磁盘空间
   - 缓解：未来添加数据清理功能

3. **兼容性**
   - 风险：不同 Puppeteer 版本的数据格式可能不兼容
   - 缓解：在升级时提供数据迁移或清理选项