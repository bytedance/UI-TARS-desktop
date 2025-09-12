# Task

## server.sessions 优化

1. server.sessions 改用 lru cache， 使用合适的过期逐出策略（看看能不能根据占用内存的比例， 比如达到 mem limit 的时候驱逐最旧的数据） ，这样既保留内存读取速度快的优点， 又能够防止 session 堆积造成的内存泄漏。 完成之后需要更新 server.sessions 用到的地方

2. AgentSession initialize 增加耗时统计， this.agent.initialize() 增加耗时统计

## 增加多租户模式

1.  AgentServer 的 server 配置增加运行模式选项 (多租户或者单租户， 默认单租户)

2.  增加 user信息用于支撑多租户模式， user 和 session 一对多的关系， 如果是多租户模式， 则创建 session和查询session列表的时候需要增加 userId 参数， userId 从请求上下文读取

3.  新增 auth 中间件， 从前端携带的信息中提取 userinfo 挂载到请求上下文， 代码参考：/Users/bytedance/Documents/projects/tars/tars-platform/packages/server/src/middleware/auth.ts。 仅多租户时开启 auth 中间件

## 数据库扩展

1.  mongodb 中新增一个集合用来存储用户自定义配置， 同时增加相应的接口，用户自定义配置包含：

- sandbox 分配策略： Shared-Pool(共享资源池) User-Exclusive(user独占)， Session-Exclusive(session独占)
- sandbox pool quota
- 是否自动滚动
- Agent 完成任务时是否通知
- 是否开启输入提示建议
- 用户所有的共享链接
- 自定义 sp 片段
- model providers

## sandbox 能力

1. 实现 sandbox-manager , 代码从 /Users/bytedance/Documents/projects/tars/tars-platform/packages/server/src/services/faas.service.ts 中获取， 做出更好的封装， sandbox-manager 支持配置：

- jwtToken 或者 getJwtToken 方法， 用来灵活代替原代码中的 getJwtToken
- baseUrl： sandbox 集群的 base url

2. 基于 sandbox-manager 实现 sandbox-scheduler， sandbox-scheduler 用来调度当前用户或者session 可以用的 sandboxURL， sandboxURL 在分配后需要写入数据库， 标记分配策略和关联的 user 和 session

   - 如果 user 或者 session 没有可用 sandbox， 或者 sandbox 已经销毁了 （使用 sandbox-manager checkInstanceNotExist 判断）， 则创建一个新的 sandbox
   - sandbox 创建和查询都需要遵循用户配置的 sandbox 分配策略， 如果是共享资源池，则只查询 Shared-Pool 类型的 sandbox， 如果是用户独占， 则只查询该用户的 sandbox， 以此类推。
   - Session-Exclusive 模式下， 当用户拥有的 sandbox 数量超过了 sandbox pool quota， 则随机复用一个用户已有的 sandbox
   - sandbox隔离策略从用户自定义配置数据获取

3. 实现 AgentSessionFactory ， 在创建 AgentSession 的时候通过 sandbox-scheduler 拿到可用的 sandboxURL ，在 AgentSession 中 createAgentWithSessionModel 时以 aioSandboxUrl 属性传入 agent 实例； 替换使用 new AgentSession 的地方

# Notes

1. 所有 db 的改造只考虑 mongodb， 不用管 sqllite
2. sandbox 相关的类写入 multimodal/tarko/agent-server-next/src/core/sandbox
