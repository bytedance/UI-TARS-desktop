/**
 * Settings used to instantiate an Agent
 */
interface AgentSetting {
  /**
   * Default used model id, if Agent.run does not specify a model,
   * this id will be used by default
   */
  defaultModel: string;
  /**
   * Model settings.
   */
  modelSettings: ModelSett;
}

/**
 * Options used to run a agent.
 */
interface AgentRunOptions {
  /**
   * Model id used to run the agent.
   */
  model: string;
  /**
   * Multimodal message.
   */
  messages: Message[];
}
