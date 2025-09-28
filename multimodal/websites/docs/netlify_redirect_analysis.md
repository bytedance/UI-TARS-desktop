# Netlify 重定向配置问题分析

## 问题配置

```toml
[[redirects]]
from = "/showcase/*"
to = "/showcase"
```

## 问题分析

### 1. 重定向规则过于宽泛
当前配置会将所有 `/showcase/` 下的子路径都重定向到 `/showcase`，这意味着：

- ✅ `/showcase/navigate-to-the-document-NUk7lAfylgrmBsFLl1cxc` → `/showcase`
- ✅ `/showcase/any-path` → `/showcase`
- ✅ `/showcase/demo/example` → `/showcase`

### 2. 缺少状态码
没有指定重定向状态码，Netlify 默认使用 301 永久重定向，但实际返回的是 404。

### 3. 静态文件访问问题
如果 `/showcase/` 目录下有实际的静态文件或页面，这个规则会阻止访问它们。

## 为什么返回 404 而不是重定向？

可能的原因：
1. **目标页面不存在**: `/showcase` 页面本身可能不存在或配置错误
2. **重定向循环**: 可能存在其他冲突的重定向规则
3. **静态生成问题**: Rspress 可能没有正确生成 `/showcase` 页面

## 建议的修复方案

### 方案 1: 移除问题重定向
如果 showcase 下应该有子页面，完全移除这个重定向：

```toml
# 删除这个重定向规则
# [[redirects]]
# from = "/showcase/*"
# to = "/showcase"
```

### 方案 2: 修正重定向逻辑
如果确实需要重定向，应该更精确：

```toml
# 只重定向不存在的页面，保留现有文件
[[redirects]]
from = "/showcase/*"
to = "/showcase"
status = 302
force = false  # 不强制重定向，如果文件存在则不重定向
```

### 方案 3: 条件重定向
只重定向特定模式：

```toml
# 只重定向特定格式的动态路径
[[redirects]]
from = "/showcase/navigate-to-*"
to = "/showcase"
status = 302
```

### 方案 4: SPA 模式重定向
如果 showcase 是单页应用：

```toml
[[redirects]]
from = "/showcase/*"
to = "/showcase/index.html"
status = 200  # 代理而不是重定向
```

## 推荐解决方案

**立即修复**：
1. 移除当前的重定向规则
2. 确保 `/showcase/` 目录下的实际文件可以正常访问
3. 如果需要 fallback，使用 `force = false` 选项

**长期优化**：
1. 实现真正的动态路由处理
2. 为不存在的文档提供友好的 404 页面
3. 添加搜索功能帮助用户找到相关内容

## 验证步骤

修复后应该验证：
1. `/showcase/` 主页面正常访问
2. 实际存在的子页面可以访问
3. 不存在的页面返回适当的 404 或重定向