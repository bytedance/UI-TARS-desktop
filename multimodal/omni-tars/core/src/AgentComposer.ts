/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentPlugin } from './AgentPlugin';
import Agent, { getLogger, LLMRequestHookPayload, LLMResponseHookPayload } from '@tarko/agent';

/**
 * Composes multiple agent plugins into a unified system prompt and instruction set
 */
export class AgentComposer {
  private plugins: AgentPlugin[] = [];
  private logger = getLogger('AgentComposer');

  constructor(option: { plugins: AgentPlugin[] }) {
    this.plugins = option.plugins;
  }

  /**
   *
   * @param agent Inject agent instance into all plugins that support it
   */
  setAgent(agent: Agent) {
    for (const plugin of this.plugins) {
      plugin.setAgent(agent);
    }
  }

  /**
   * Initialize all agent plugins
   */
  async initialize(): Promise<void> {
    for (const plugin of this.plugins) {
      await plugin.initialize?.();
    }
  }

  /**
   * Generate the composed system prompt from all agent plugins
   */
  generateSystemPrompt(): string {
    const envs = this.getAvailableEnvironments();

    this.logger.info('Available Environments: ', envs);

    const basePrompt = `You are a general AI agent, a helpful AI assistant that can interact with the following environments to solve tasks: ${envs}.
    You should first think about the reasoning process in the mind and then provide the user with the answer. The reasoning process is enclosed within <think> </think> tags, i.e. <think> reasoning process here </think> answer here

`;

    // Combine all environment sections
    const environmentSections = this.plugins
      .filter((plugin) => plugin.environmentSection)
      .map((plugin) => plugin.environmentSection)
      .join('\n\n');

    // Generate the environment usage instructions
    const usageInstructions = this.generateUsageInstructions();

    return basePrompt + environmentSections + '\n\n' + usageInstructions;
  }

  /**
   * Get all tools from all agent plugins
   */
  getAllTools() {
    return this.plugins.flatMap((plugin) => plugin.getTools?.() || []);
  }

  /**
   * Execute onLLMRequest hooks for all plugins
   */
  async executeOnLLMRequest(id: string, payload: LLMRequestHookPayload): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.onLLMRequest) {
        await plugin.onLLMRequest(id, payload);
      }
    }
  }

  /**
   * Execute onLLMResponse hooks for all plugins
   */
  async executeOnLLMResponse(id: string, payload: LLMResponseHookPayload): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.onLLMResponse) {
        await plugin.onLLMResponse(id, payload);
      }
    }
  }

  /**
   * Execute onEachAgentLoopStart hooks for all plugins
   */
  async executeOnEachAgentLoopStart(): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.onEachAgentLoopStart) {
        await plugin.onEachAgentLoopStart();
      }
    }
  }

  /**
   * Execute onEachAgentLoopEnd hooks for all plugins
   */
  async executeOnEachAgentLoopEnd(): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.onEachAgentLoopEnd) {
        await plugin.onEachAgentLoopEnd();
      }
    }
  }

  /**
   * Execute onAgentLoopEnd hooks for all plugins
   */
  async executeOnAgentLoopEnd(): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.onAgentLoopEnd) {
        await plugin.onAgentLoopEnd();
      }
    }
  }

  /**
   * Get list of available environments from plugins
   */
  private getAvailableEnvironments(): string {
    const environments = [];

    if (this.hasPlugin('code')) environments.push('code');
    if (this.hasPlugin('mcp')) environments.push('mcp functions');
    if (this.hasPlugin('computer') || this.hasPlugin('gui')) environments.push('computer');

    return environments.join(', ');
  }

  /**
   * Check if a specific plugin type is available
   */
  private hasPlugin(type: string): boolean {
    //TODO: Currently, it is determined whether a plugin is matched through the name string, and it needs to be optimized.
    return this.plugins.some((plugin) => plugin.name?.toLowerCase().includes(type));
  }

  /**
   * Generate usage instructions based on available plugins
   */
  private generateUsageInstructions(): string {
    const availableEnvs = [];

    if (this.hasPlugin('code')) {
      availableEnvs.push('<code_env>');
    }
    if (this.hasPlugin('mcp')) {
      availableEnvs.push('<mcp_env>');
    }
    if (this.hasPlugin('computer') || this.hasPlugin('gui')) {
      availableEnvs.push('<computer_env>');
    }

    return `<IMPORTANT_NOTE>
- After the reasoning process which ends with </think>, please start with and be enclosed by <environment_name> and </environment_name> tags, indicating the environment you intend to use for the next action.
- Within these environment tags, follow the output format specified in the corresponding environment's description. The available environment names are: ${availableEnvs.join(', ')}. For example, to use code:

<think> Now let's look at the data_processor.py file since that's what's being executed and causing the error. To look at file content, I need to use the code environment. </think>
<code_env>
<function=str_replace_editor>
<parameter=command>view</parameter>
<parameter=path>/app/src/data_processor.py</parameter>
</function>
</code_env>

${
  this.hasPlugin('mcp')
    ? `To use mcp functions:

<think> I need to search information about Season 2015/16 Stats UEFA Champions League top goal scoring teams </think>
<mcp_env>
<|FunctionCallBegin|>[{"name":"Search","parameters":{"query":"Season 2015/16 Stats UEFA Champions League top goal scoring teams"}}]<|FunctionCallEnd|>
</mcp_env>`
    : ''
}

${
  this.hasPlugin('computer') || this.hasPlugin('gui')
    ? `To use computer:

<think> To continue, I need to operate the computer to pass the verification process. </think>
<computer_env>
Action: click(point='<point>100 200</point>')
</computer_env>`
    : ''
}

- To finish a task, please submit your answer by enclosing <answer> and </answer> tags. For example:
<answer>
The answer is 42.
</answer>
</IMPORTANT_NOTE>`;
  }
}
