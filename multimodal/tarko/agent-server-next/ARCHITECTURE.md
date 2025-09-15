# DAO架构重构

## 概述

本文档描述了 Agent Server Next 的数据访问层（DAO）架构重构，该重构解决了原有架构中的职责重叠和数据访问不一致问题。

## 问题背景

### 原架构问题

1. **职责重叠**: `src/core/` 和 `src/services/` 目录存在职责重叠
2. **架构不一致**: 
   - Session/Event 操作直接在 `MongoDBStorageProvider` 中处理
   - UserConfig 操作通过 `UserConfigService` 绕过存储抽象
3. **接口不完整**: SQLite 不支持 UserConfig 和 SandboxAllocation
4. **紧耦合**: 服务层直接依赖具体的存储实现

## 新架构设计

### 分层架构

```
src/
├── core/                    # 业务领域层（保持不变）
│   ├── session/            # 会话管理
│   └── sandbox/            # 沙箱管理
├── services/               # 业务服务层
│   └── UserConfigService.ts   # 使用 IUserConfigDAO
├── dao/                    # 数据访问层（新增）
│   ├── interfaces/         # DAO接口定义
│   ├── mongodb/           # MongoDB实现
│   ├── sqlite/            # SQLite实现
│   └── factory.ts         # 工厂函数
└── storage/               # 存储提供者层（重构）
    └── MongoDBStorageProvider/ # 使用DAO，保持向后兼容
```

### 核心原则

1. **单一职责**: 每个DAO处理一个实体的数据操作
2. **依赖倒置**: 服务依赖DAO接口，不依赖具体实现
3. **统一性**: 所有数据操作遵循相同的DAO模式
4. **可替换性**: 轻松切换不同的存储后端

## DAO接口设计

### 核心接口

- `IUserConfigDAO` - 用户配置数据访问
- `ISessionDAO` - 会话数据访问
- `IEventDAO` - 事件数据访问
- `ISandboxAllocationDAO` - 沙箱分配数据访问
- `IDAOFactory` - DAO工厂接口

### 实现

#### MongoDB实现
- `MongoDAOFactory` - MongoDB DAO工厂
- `UserConfigDAO`, `SessionDAO`, `EventDAO`, `SandboxAllocationDAO`

#### SQLite实现
- `SQLiteDAOFactory` - SQLite DAO工厂
- 完整的DAO实现，新增 UserConfig 和 SandboxAllocation 支持

## 使用方式

### 基本用法

```typescript
import { createDAOFactory, getStorageBackend } from './dao';
import { UserConfigService } from './services/UserConfigService';

// 创建DAO工厂
const config = { uri: 'mongodb://localhost:27017/mydb' };
const backend = getStorageBackend(config);
const daoFactory = createDAOFactory(backend, config);

// 初始化
await daoFactory.initialize();

// 创建服务
const userConfigService = new UserConfigService(
  daoFactory.getUserConfigDAO()
);

// 使用服务
const userConfig = await userConfigService.getOrCreateUserConfig('user123');
```

### 依赖注入容器

```typescript
import { DAOContainer } from './examples/dao-usage-example';

const container = new DAOContainer();
await container.initialize(config);

const userConfigService = container.getUserConfigService();
const daoFactory = container.getDAOFactory();
```

## 向后兼容性

### MongoDBStorageProvider

重构后的 `MongoDBStorageProvider` 保持完全向后兼容：

- 所有现有方法继续工作
- 内部使用DAO实现
- 添加了 `getDAOFactory()` 方法获取DAO访问
- `getUserConfigModel()` 和 `getSandboxAllocationModel()` 标记为 `@deprecated`

### 迁移路径

1. **立即可用**: 现有代码无需修改即可工作
2. **渐进迁移**: 新代码使用DAO模式
3. **最终目标**: 逐步将现有代码迁移到DAO模式

## 优势

### 技术优势

- ✅ **清晰的职责分离**: 每层职责明确
- ✅ **更好的可测试性**: DAO接口易于Mock
- ✅ **统一的数据访问模式**: 一致的API设计
- ✅ **多后端支持**: 轻松切换MongoDB/SQLite
- ✅ **类型安全**: 完整的TypeScript类型支持

### 开发体验

- ✅ **依赖注入友好**: 支持现代DI容器
- ✅ **单元测试友好**: Mock DAO接口进行测试
- ✅ **扩展性强**: 新增实体只需添加对应DAO
- ✅ **错误处理一致**: 统一的错误处理模式

## 示例和测试

### 测试示例

参见 `src/tests/dao/UserConfigService.test.ts` 了解如何测试使用DAO的服务。

### 使用示例

参见 `src/examples/dao-usage-example.ts` 了解完整的使用示例。

## 未来扩展

### 新增实体

要添加新的数据实体，只需要：

1. 在 `src/dao/interfaces/` 中定义DAO接口
2. 在 `mongodb/` 和 `sqlite/` 中实现具体DAO
3. 更新 `IDAOFactory` 接口
4. 在工厂中添加相应的getter方法

### 新增存储后端

要支持新的存储后端（如Redis、PostgreSQL）：

1. 在 `src/dao/` 中创建新的实现目录
2. 实现所有DAO接口
3. 创建相应的DAO工厂
4. 更新 `factory.ts` 中的工厂函数

## 总结

这次架构重构通过引入DAO模式，成功解决了原有的职责重叠和接口不一致问题，为项目提供了：

- 更清晰的架构分层
- 更好的代码组织
- 更强的可测试性
- 更佳的扩展性
- 完整的多后端支持

同时保持了完全的向后兼容性，确保现有代码无需修改即可继续工作。