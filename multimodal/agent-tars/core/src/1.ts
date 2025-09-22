interface AgentRuntimeSetting {
  // UI 渲染的 schema
  schema: JSONSchema7;
  // 转换函数
  transform?: (runtimeSettings: object) => object;
}
