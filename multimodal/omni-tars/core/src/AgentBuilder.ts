/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentPlugin, AgentCompositionConfig } from './types';
import { ComposableAgent, ComposableAgentOptions } from './ComposableAgent';

/**
 * Builder pattern for easy creation of composed agents
 */
export class AgentBuilder {
  private plugins: AgentPlugin[] = [];
  private name = 'ComposedAgent';
  private maxIterations = 100;
  private otherOptions: Partial<ComposableAgentOptions> = {};

  /**
   * Set the agent name
   */
  withName(name: string): AgentBuilder {
    this.name = name;
    return this;
  }

  /**
   * Set maximum iterations
   */
  withMaxIterations(maxIterations: number): AgentBuilder {
    this.maxIterations = maxIterations;
    return this;
  }

  /**
   * Add an agent plugin to the composition
   */
  addPlugin(plugin: AgentPlugin): AgentBuilder {
    this.plugins.push(plugin);
    return this;
  }

  /**
   * Add multiple agent plugins
   */
  addPlugins(...plugins: AgentPlugin[]): AgentBuilder {
    this.plugins.push(...plugins);
    return this;
  }

  /**
   * Add other agent options
   */
  withOptions(options: Partial<ComposableAgentOptions>): AgentBuilder {
    this.otherOptions = { ...this.otherOptions, ...options };
    return this;
  }

  /**
   * Build the composed agent
   */
  build(): ComposableAgent {
    const options: ComposableAgentOptions = {
      name: this.name,
      plugins: this.plugins,
      maxIterations: this.maxIterations,
      ...this.otherOptions,
    };

    return new ComposableAgent(options);
  }

  /**
   * Static factory method for fluent API
   */
  static create(): AgentBuilder {
    return new AgentBuilder();
  }
}
