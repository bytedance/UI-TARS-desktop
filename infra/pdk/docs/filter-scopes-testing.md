# PDK Filter Scopes 功能测试指南

## 功能概述

PDK 的 `--filter-scopes` 参数用于在生成 changelog 时过滤特定 scope 的 commit。默认情况下支持全部 scope，可通过 CLI 参数指定需要包含的 scope。

## 测试场景

### 1. 基本功能测试

#### 测试默认行为（包含所有 scope）
```bash
# 生成包含所有 scope 的 changelog
pdk changelog --from-tag=v1.0.0 --to-tag=v1.1.0
# 或
pdk release --filter-scopes=""
```

#### 测试指定 scope 过滤
```bash
# 只生成特定 scope 的 changelog
pdk changelog --from-tag=v1.0.0 --to-tag=v1.1.0 --filter-scopes=tars,agent
# 或
pdk release --filter-scopes=tars,agent
```

### 2. AI 生成 changelog 测试

#### 使用 AI 生成 + scope 过滤
```bash
pdk changelog --use-ai --filter-scopes=tars,agent --provider=azure-openai --model=gpt-4o
# 或
pdk release --use-ai --filter-scopes=tars,agent --provider=azure-openai --model=gpt-4o
```

### 3. 实际项目测试

#### 在 multimodal 项目中测试
```bash
cd multimodal
# 使用预配置的 scope 过滤
pnpm release:ai:dryrun
```

#### 在 infra 项目中测试
```bash
cd infra
# 测试包含所有 scope（适合 infra monorepo）
pdk changelog --filter-scopes=""
# 或指定 infra 相关 scope
pdk changelog --filter-scopes=infra,pdk,build
```

## 验证方法

### 1. 检查 commit 过滤效果
创建测试 commit：
```bash
feat(tars): add new feature
feat(agent): improve performance  
feat(infra): update build system
chore: update dependencies
```

使用不同 filter 参数验证：
```bash
# 应包含所有 commit
pdk changelog --filter-scopes=""

# 只包含 tars 和 agent 的 feat
pdk changelog --filter-scopes="tars,agent"

# 只包含 infra 相关
pdk changelog --filter-scopes="infra,pdk,build"
```

### 2. 验证 AI 生成结果
```bash
# AI 生成时应用 scope 过滤
pdk changelog --use-ai --filter-scopes="tars,agent" --dry-run
```

### 3. 验证 GitHub Release 生成
```bash
# 生成 GitHub Release 时应用 scope 过滤
pdk release --create-github-release --filter-scopes="tars,agent" --dry-run
```

## 常见问题排查

### 1. 空结果
- 检查 tag 是否存在：`git tag --list`
- 检查 commit 格式是否符合 conventional commits
- 验证 scope 名称是否正确

### 2. 过滤不生效
- 确认 scope 名称大小写敏感
- 检查是否有空格或特殊字符
- 验证 commit message 格式：`type(scope): description`

### 3. AI 生成异常
- 检查 API key 和配置
- 验证网络连接
- 查看详细错误日志

## 最佳实践

1. **项目配置**：在 package.json 中预定义常用的 scope 组合
2. **CI/CD 集成**：在发布流程中使用固定的 scope 过滤
3. **文档维护**：保持 scope 命名规范的一致性
4. **测试覆盖**：定期验证不同 scope 组合的生成效果