/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { z } from 'zod';

export const EXEC_POLICY_VERSION = 'v1';

export const EXEC_POLICY_REASON_CODES = [
  'policy_config_invalid',
  'host_sandbox_passthrough',
  'security_mode_deny',
  'security_mode_full',
  'allowlist_match',
  'allowlist_miss',
  'ask_mode_always',
  'ask_mode_on_miss',
] as const;

export type ExecPolicyReasonCode = (typeof EXEC_POLICY_REASON_CODES)[number];

export type ExecPolicyDecision = 'allow' | 'deny' | 'ask';

const EXEC_POLICY_HOSTS = ['sandbox', 'gateway', 'node'] as const;
const EXEC_POLICY_SECURITY_MODES = ['deny', 'allowlist', 'full'] as const;
const EXEC_POLICY_ASK_MODES = ['off', 'on-miss', 'always'] as const;

const ExecPolicyConfigV1Schema = z
  .object({
    host: z.enum(EXEC_POLICY_HOSTS).default('sandbox'),
    security: z.enum(EXEC_POLICY_SECURITY_MODES).default('deny'),
    ask: z.enum(EXEC_POLICY_ASK_MODES).default('on-miss'),
    allowlist: z.array(z.string().min(1)).default([]),
  })
  .strict();

const ExecPolicyIntentV1Schema = z.object({
  intentId: z.string().min(1),
  operation: z.string().min(1),
  actionType: z.string(),
});

export type ExecPolicyConfigV1 = z.infer<typeof ExecPolicyConfigV1Schema>;
export type ExecPolicyConfigV1Input = z.input<typeof ExecPolicyConfigV1Schema>;

export type ExecPolicyDecisionV1 = {
  version: typeof EXEC_POLICY_VERSION;
  intentId: string;
  operation: string;
  actionType: string;
  decision: ExecPolicyDecision;
  reasonCodes: ExecPolicyReasonCode[];
  mode: 'dry-run';
  evaluatedAt: number;
  policy: Pick<ExecPolicyConfigV1, 'host' | 'security' | 'ask'>;
};

export type LegacyPolicyDecisionAdapterV1 = {
  decision: 'allow' | 'deny';
  mappedFrom: ExecPolicyDecision;
};

const globToRegExp = (pattern: string): RegExp => {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');

  return new RegExp(`^${escaped}$`);
};

const matchesAllowlist = (operation: string, allowlist: string[]): boolean => {
  return allowlist.some((pattern) => {
    try {
      return globToRegExp(pattern).test(operation);
    } catch {
      return false;
    }
  });
};

const buildDecision = (
  intent: z.infer<typeof ExecPolicyIntentV1Schema>,
  policy: Pick<ExecPolicyConfigV1, 'host' | 'security' | 'ask'>,
  decision: ExecPolicyDecision,
  reasonCodes: ExecPolicyReasonCode[],
): ExecPolicyDecisionV1 => {
  return {
    version: EXEC_POLICY_VERSION,
    intentId: intent.intentId,
    operation: intent.operation,
    actionType: intent.actionType,
    decision,
    reasonCodes,
    mode: 'dry-run',
    evaluatedAt: Date.now(),
    policy,
  };
};

export const evaluateExecPolicyV1 = (params: {
  intent: z.input<typeof ExecPolicyIntentV1Schema>;
  config?: ExecPolicyConfigV1Input;
}): ExecPolicyDecisionV1 => {
  const intent = ExecPolicyIntentV1Schema.parse(params.intent);
  const configParse = ExecPolicyConfigV1Schema.safeParse(params.config ?? {});

  if (!configParse.success) {
    return buildDecision(
      intent,
      {
        host: 'sandbox',
        security: 'deny',
        ask: 'on-miss',
      },
      'deny',
      ['policy_config_invalid'],
    );
  }

  const config = configParse.data;

  if (config.host === 'sandbox') {
    return buildDecision(intent, config, 'allow', ['host_sandbox_passthrough']);
  }

  if (config.security === 'deny') {
    return buildDecision(intent, config, 'deny', ['security_mode_deny']);
  }

  if (config.ask === 'always') {
    return buildDecision(intent, config, 'ask', ['ask_mode_always']);
  }

  if (config.security === 'full') {
    return buildDecision(intent, config, 'allow', ['security_mode_full']);
  }

  const matched = matchesAllowlist(intent.operation, config.allowlist);
  if (matched) {
    return buildDecision(intent, config, 'allow', ['allowlist_match']);
  }

  if (config.ask === 'on-miss') {
    return buildDecision(intent, config, 'ask', [
      'allowlist_miss',
      'ask_mode_on_miss',
    ]);
  }

  return buildDecision(intent, config, 'deny', ['allowlist_miss']);
};

export const adaptExecPolicyV1ToLegacyAllowDeny = (
  decision: ExecPolicyDecisionV1,
): LegacyPolicyDecisionAdapterV1 => {
  if (decision.decision === 'deny') {
    return {
      decision: 'deny',
      mappedFrom: 'deny',
    };
  }

  return {
    decision: 'allow',
    mappedFrom: decision.decision,
  };
};
