# AgentServer Next - 技术架构文档

## 概述

本次升级对 AgentServer Next 进行了全面的架构优化，主要包括会话管理优化、多租户架构支持、沙箱管理系统等核心功能。

## 1. 会话管理优化

### 1.1 LRU 缓存系统

**文件位置**: `src/core/session/SessionManager.ts`

**核心特性**:
- 基于 LRU (最近最少使用) 算法的会话缓存
- 可配置的最大会话数和内存限制
- 自动驱逐策略，防止内存泄漏
- 实时内存使用监控

**配置参数**:
```typescript
interface SessionManagerConfig {
  maxSessions?: number;     // 最大会话数，默认 100
  memoryLimitMB?: number;   // 内存限制(MB)，默认 512
  checkIntervalMs?: number; // 检查间隔(ms)，默认 30000
}
```

**自动驱逐策略**:
- 内存使用超过 80% 限制时触发驱逐
- 会话数超过最大限制时触发驱逐
- 优先驱逐最久未使用的会话
- 每次驱逐至少 10% 的会话

### 1.2 性能监控

**AgentSession 初始化耗时统计**:
- `agent.initialize()` 方法耗时
- 总初始化耗时（包括 AGIO 等）
- 详细日志记录，便于性能分析

## 2. 多租户架构

### 2.1 服务器配置

**多租户模式配置**:
```typescript
interface MultiTenantConfig {
  mode: 'single' | 'multi';  // 运行模式
  authRequired?: boolean;     // 是否需要认证
}
```

**配置示例**:
```typescript
const serverConfig = {
  mode: 'multi',
  authRequired: true,
  // 其他配置...
}
```

### 2.2 认证中间件

**文件位置**: `src/middlewares/auth.ts`

**支持的认证方式**:
1. **SSO 集成**: 通过 `X-User-Info` 头部获取用户信息
2. **JWT Token**: 通过 `Authorization` 头部的 JWT 令牌
3. **API Key**: 通过 `X-API-Key` 头部（基础支持）

**用户信息结构**:
```typescript
interface UserInfo {
  userId: string;
  email: string;
  name?: string;
  organization?: string;
}
```

### 2.3 数据库扩展

**会话表扩展**:
```typescript
interface SessionDocument {
  _id: string;
  createdAt: number;
  updatedAt: number;
  workspace: string;
  userId?: string;        // 新增：用户ID
  metadata?: SessionMetadata;
}
```

**索引优化**:
- `{ userId: 1, updatedAt: -1 }` - 多租户会话查询
- `{ workspace: 1, userId: 1 }` - 工作空间用户查询

## 3. 用户配置系统

### 3.1 用户配置结构

**文件位置**: `src/services/UserConfigService.ts`

**配置项**:
```typescript
interface UserConfig {
  sandboxAllocationStrategy: 'Shared-Pool' | 'User-Exclusive' | 'Session-Exclusive';
  sandboxPoolQuota: number;
  autoScrollEnabled: boolean;
  taskCompletionNotificationEnabled: boolean;
  inputSuggestionsEnabled: boolean;
  sharedLinks: string[];
  customSpFragments: string[];
  modelProviders: Array<{
    name: string;
    baseURL?: string;
    models: string[];
  }>;
}
```

### 3.2 API 接口

**RESTful API 设计**:
- `GET /api/user-config` - 获取用户配置
- `POST /api/user-config` - 创建用户配置
- `PUT /api/user-config` - 更新用户配置
- `DELETE /api/user-config` - 删除用户配置
- `GET /api/user-config/ensure` - 获取或创建配置

**专项管理接口**:
- `POST/DELETE /api/user-config/shared-links` - 共享链接管理
- `POST/DELETE /api/user-config/sp-fragments` - SP 片段管理
- `PUT /api/user-config/model-providers` - 模型提供商管理

## 4. 沙箱管理系统

### 4.1 沙箱管理器

**文件位置**: `src/core/sandbox/SandboxManager.ts`

**核心功能**:
- 沙箱实例创建和删除
- JWT 认证支持
- TTL 管理和刷新
- 实例健康检查

**配置结构**:
```typescript
interface SandboxConfig {
  baseUrl: string;
  jwtToken?: string;
  getJwtToken?: () => Promise<string>;
  defaultTtlMinutes?: number;
}
```

### 4.2 沙箱调度器

**文件位置**: `src/core/sandbox/SandboxScheduler.ts`

**分配策略**:
1. **Shared-Pool**: 共享资源池，多用户共享沙箱
2. **User-Exclusive**: 用户独占，每个用户有独立沙箱
3. **Session-Exclusive**: 会话独占，每个会话有独立沙箱

**配额管理**:
- 用户沙箱数量限制
- 超额时自动复用最旧的沙箱
- 沙箱使用时间追踪

### 4.3 沙箱分配记录

**MongoDB 集合**: `sandboxAllocations`

**记录结构**:
```typescript
interface SandboxAllocation {
  sandboxId: string;
  sandboxUrl: string;
  userId?: string;
  sessionId?: string;
  allocationStrategy: SandboxAllocationStrategy;
  createdAt: number;
  lastUsedAt: number;
  isActive: boolean;
}
```

## 5. 会话工厂模式

### 5.1 AgentSessionFactory

**文件位置**: `src/core/session/AgentSessionFactory.ts`

**核心功能**:
- 统一的会话创建接口
- 自动沙箱分配
- 用户上下文处理
- 会话恢复支持

**创建流程**:
1. 解析用户上下文
2. 分配沙箱资源
3. 创建 AgentSession 实例
4. 注入沙箱 URL
5. 保存会话信息

### 5.2 向后兼容

**兼容性保证**:
- 保持原有 `server.sessions` 接口
- 自动迁移现有会话
- 渐进式升级支持

## 6. 系统监控

### 6.1 内存统计

**监控指标**:
```typescript
interface MemoryStats {
  sessions: number;              // 当前会话数
  estimatedMemoryMB: number;     // 估算内存使用
  memoryLimitMB: number;         // 内存限制
  memoryUsagePercent: number;    // 内存使用百分比
}
```

### 6.2 系统信息接口

**API 端点**: `GET /api/v1/system`

**返回信息**:
- 服务器配置信息
- 多租户状态
- 内存使用统计
- 沙箱分配状态

## 7. 部署配置

### 7.1 单租户模式（默认）

```typescript
const serverConfig = {
  server: {
    port: 3000,
    mode: 'single',  // 单租户模式
    // 其他配置...
  }
}
```

### 7.2 多租户模式

```typescript
const serverConfig = {
  server: {
    port: 3000,
    mode: 'multi',         // 多租户模式
    authRequired: true,    // 开启认证
    maxSessions: 1000,     // 会话限制
    memoryLimitMB: 2048,   // 内存限制
    sandbox: {             // 沙箱配置
      baseUrl: 'sandbox.example.com',
      getJwtToken: async () => 'jwt-token',
      defaultTtlMinutes: 120
    }
  }
}
```

## 8. 迁移指南

### 8.1 现有代码兼容

**会话创建**:
```typescript
// 旧方式（仍然支持）
server.sessions[sessionId] = new AgentSession(server, sessionId);

// 新方式（推荐）
const { session } = await server.getSessionFactory().createSession({
  sessionId,
  context: honoContext
});
```

### 8.2 渐进式升级

1. **第一阶段**: 部署新版本，保持单租户模式
2. **第二阶段**: 配置多租户模式，测试认证
3. **第三阶段**: 启用沙箱管理，配置分配策略
4. **第四阶段**: 优化内存配置，监控性能

## 9. 性能优化

### 9.1 内存管理

- LRU 缓存自动驱逐
- 可配置内存阈值
- 实时内存监控

### 9.2 数据库优化

- 复合索引优化查询
- 用户维度数据分离
- 沙箱分配状态追踪

### 9.3 沙箱资源

- 智能分配策略
- 资源复用机制
- 自动清理无效分配

## 10. 安全考虑

### 10.1 认证安全

- JWT 签名验证
- 用户信息加密传输
- API Key 访问控制

### 10.2 数据隔离

- 用户级数据隔离
- 会话级访问控制
- 沙箱资源隔离

### 10.3 审计日志

- 用户操作记录
- 会话创建删除日志
- 沙箱分配释放记录

---

## 附录：实现清单

### ✅ 已完成功能

1. **会话管理优化**
   - ✅ LRU 缓存系统 (`SessionManager`)
   - ✅ 内存驱逐策略
   - ✅ AgentSession 初始化性能监控

2. **多租户架构**
   - ✅ 服务器模式配置 (`single`/`multi`)
   - ✅ 认证中间件 (`authMiddleware`)
   - ✅ 用户上下文管理
   - ✅ 数据库schema扩展

3. **用户配置系统**
   - ✅ MongoDB 用户配置集合
   - ✅ 用户配置服务 (`UserConfigService`)
   - ✅ 用户配置API (`UserConfigController`)
   - ✅ RESTful API端点

4. **沙箱管理**
   - ✅ 沙箱管理器 (`SandboxManager`)
   - ✅ 沙箱调度器 (`SandboxScheduler`)
   - ✅ 分配策略实现
   - ✅ 配额管理

5. **会话工厂**
   - ✅ AgentSessionFactory 实现
   - ✅ 自动沙箱分配
   - ✅ 用户上下文集成
   - ✅ 向后兼容支持

6. **系统监控**
   - ✅ 内存统计API
   - ✅ 系统信息端点
   - ✅ 性能监控集成

### 📁 文件结构

```
src/
├── core/
│   ├── session/
│   │   ├── SessionManager.ts          # LRU缓存会话管理
│   │   └── AgentSessionFactory.ts     # 会话工厂
│   ├── sandbox/
│   │   ├── SandboxManager.ts          # 沙箱管理器
│   │   ├── SandboxScheduler.ts        # 沙箱调度器
│   │   └── types.ts                   # 沙箱类型定义
│   └── AgentSession.ts                # 扩展性能监控
├── middlewares/
│   └── auth.ts                        # 多租户认证中间件
├── services/
│   └── UserConfigService.ts           # 用户配置服务
├── api/
│   ├── controllers/
│   │   ├── UserConfigController.ts    # 用户配置控制器
│   │   └── sessions.ts                # 更新多租户支持
│   └── routes/
│       └── user-config.ts             # 用户配置路由
├── storage/
│   └── MongoDBStorageProvider/
│       └── MongoDBSchemas.ts          # 扩展数据库schemas
├── server.ts                          # 核心服务器更新
└── types.ts                           # 类型定义扩展
```

**注意**: 该架构设计确保了系统的可扩展性、安全性和性能，同时保持向后兼容。建议在生产环境中分阶段部署，逐步启用各项功能。