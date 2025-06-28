{/\* ### 未来还会提供 Electron App 吗？

虽然 CLI 具备一些优势，但仍然无法拥有 Electron App 的一些平台提供的原生能力，如[Tray](https://www.electronjs.org/docs/latest/tutorial/tray)、更好的 [Notification](https://www.electronjs.org/docs/latest/tutorial/notifications) 等等。

选择 CLI 是一种权衡，当我们认为 Agent TARS CLI + Web UI 已经达到一个相对成熟的状态，我们会计划提供 Electron 版本。

得益于 Agent TARS Beta 的[新架构](#archtecutre-improvement)，构建一个 Electron App 将会轻松很多，你只需要将 Agent TARS Server 与 Web UI 嵌入到 Electron 中即可，我们欢迎社区人士参与建设，尤其是擅长 Vibe Coding 的朋友们，feel free to try it。 \*/}



## 常见问题

## 下一步计划

挑战：

- Context Engineering
- MCP Tool 返回的不确定性

## 参考资料

\[1] [Don't Build Multi-Agents](https://cognition.ai/blog/dont-build-multi-agents) \[2] [Volcengine > Vision](https://www.volcengine.com/docs/82379/1362931)

（没错，在 Agent Loop 中，LLM 本质也是环境）；

为此，我们引入了一种设计模式，能够够在运行时将 Agent 所依赖的环境保存为 Snapshot，接着，可以基于 Snapshot 来回放 Agent，确保 Agent 最终的内存输出、状态符合预期。
