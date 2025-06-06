/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Agio (Agent Insights and Observations) is a standard agent operation monitoring protocol
 * for gathering insights into Agent behavior, performance and usage patterns.
 *
 * Key design principles:
 * - Standardization: Provides a consistent event schema for all agent activities
 * - Extensibility: Allows developers to implement the Agio standard in their own systems
 * - Privacy-focused: Supports private deployments with full control over data collection
 * - Observability: Enables comprehensive monitoring and analytics of agent performance
 *
 * The goal of this project is to provide a set of server-side protocol standards for
 * Agent running processes, allowing you to focus more on implementing the Agent Monitor
 * server instead of designing these data details yourself.
 */

export * from './types';
