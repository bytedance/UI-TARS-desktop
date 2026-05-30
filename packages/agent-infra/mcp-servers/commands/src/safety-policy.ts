import { createHash } from 'node:crypto';

type CommandSafetyAction = 'allow' | 'deny' | 'require_approval';

type CommandSafetyRule = {
  id: string;
  action: CommandSafetyAction;
  reason: string;
  patterns: string[];
};

type CommandSafetyPolicyConfig = {
  enabled?: boolean;
  defaultAction?: CommandSafetyAction;
  defaultReason?: string;
  useDefaultRules?: boolean;
  rules?: CommandSafetyRule[];
};

type CommandSafetySubject = {
  toolName: string;
  command?: string;
  interpreter?: string;
  script?: string;
  cwd?: string;
};

type CommandSafetyDecision = {
  action: CommandSafetyAction;
  reason?: string;
  ruleId?: string;
  approvalRequestId?: string;
};

type CommandApprovalRiskLevel = 'low' | 'medium' | 'high' | 'critical';

type CommandApprovalRequest = {
  id: string;
  title: string;
  reason: string;
  source: 'commands';
  riskLevel: CommandApprovalRiskLevel;
  ruleId?: string;
  subject: CommandSafetySubject;
  createdAt: string;
};

const DEFAULT_COMMAND_SAFETY_RULES: CommandSafetyRule[] = [
  {
    id: 'destructive-file-removal',
    action: 'require_approval',
    reason:
      'The command appears to recursively or forcefully remove filesystem data.',
    patterns: [
      String.raw`(?:^|[;&|]\s*)rm\s+(?:-[^\s]*[rRfF][^\s]*|--recursive|--force)`,
      String.raw`(?:^|[;&|]\s*)rmdir\s+(?:/s|-[^\s]*r)`,
      String.raw`(?:^|[;&|]\s*)del(?:ete)?\s+[\s\S]*(?:/s|/q)`,
      String.raw`\bRemove-Item\b[\s\S]*(?:-Recurse|-Force)`,
    ],
  },
  {
    id: 'disk-or-partition-mutation',
    action: 'require_approval',
    reason: 'The command appears to modify disks, partitions, or filesystems.',
    patterns: [
      String.raw`(?:^|[;&|]\s*)(?:format|mkfs(?:\.[a-z0-9]+)?|fdisk|parted|diskpart|diskutil)\b`,
    ],
  },
  {
    id: 'system-power-action',
    action: 'require_approval',
    reason:
      'The command appears to shut down, restart, or power off the system.',
    patterns: [
      String.raw`(?:^|[;&|]\s*)(?:shutdown|reboot|halt|poweroff)\b`,
      String.raw`\bRestart-Computer\b`,
      String.raw`\bStop-Computer\b`,
    ],
  },
  {
    id: 'privileged-or-recursive-permission-change',
    action: 'require_approval',
    reason:
      'The command appears to request elevated privileges or recursively change permissions.',
    patterns: [
      String.raw`(?:^|[;&|]\s*)(?:sudo|su)\b`,
      String.raw`(?:^|[;&|]\s*)(?:chmod|chown)\s+[\s\S]*(?:-R|--recursive)`,
    ],
  },
  {
    id: 'destructive-git-operation',
    action: 'require_approval',
    reason:
      'The command appears to destructively modify git working tree state.',
    patterns: [
      String.raw`(?:^|[;&|]\s*)git\s+reset\s+--hard\b`,
      String.raw`(?:^|[;&|]\s*)git\s+clean\s+-[^\s]*f`,
    ],
  },
  {
    id: 'remote-script-execution',
    action: 'require_approval',
    reason:
      'The command appears to download remote content and pipe it into a shell or evaluator.',
    patterns: [
      String.raw`\b(?:curl|wget)\b[\s\S]*\|[\s\S]*(?:sh|bash|zsh|fish|powershell|pwsh)\b`,
      String.raw`\b(?:Invoke-WebRequest|Invoke-RestMethod|iwr|irm)\b[\s\S]*(?:Invoke-Expression|\biex\b)`,
    ],
  },
];

function resolveSafetyPolicy(policy?: CommandSafetyPolicyConfig): Required<
  Pick<CommandSafetyPolicyConfig, 'enabled' | 'defaultAction' | 'rules'>
> & {
  defaultReason?: string;
} {
  const useDefaultRules = policy?.useDefaultRules ?? true;
  return {
    enabled: policy?.enabled ?? process.env.COMMANDS_SAFETY_ENABLED !== 'false',
    defaultAction: policy?.defaultAction ?? 'allow',
    defaultReason: policy?.defaultReason,
    rules: [
      ...(policy?.rules ?? []),
      ...(useDefaultRules ? DEFAULT_COMMAND_SAFETY_RULES : []),
    ],
  };
}

function evaluateCommandSafety(
  subject: CommandSafetySubject,
  policy?: CommandSafetyPolicyConfig,
): CommandSafetyDecision {
  const resolvedPolicy = resolveSafetyPolicy(policy);

  if (!resolvedPolicy.enabled) {
    return { action: 'allow' };
  }

  const executableText = getExecutableText(subject);

  for (const rule of resolvedPolicy.rules) {
    if (
      rule.patterns.some((pattern) => matchesPattern(pattern, executableText))
    ) {
      if (rule.action === 'allow') {
        return { action: 'allow' };
      }
      return decisionForAction(rule.action, subject, rule.reason, rule.id);
    }
  }

  if (resolvedPolicy.defaultAction !== 'allow') {
    return decisionForAction(
      resolvedPolicy.defaultAction,
      subject,
      resolvedPolicy.defaultReason ?? 'The command requires explicit approval.',
    );
  }

  return { action: 'allow' };
}

function formatSafetyDecision(decision: CommandSafetyDecision): string {
  const status =
    decision.action === 'require_approval'
      ? 'approval_required'
      : decision.action;

  const lines = [
    `Command safety policy: ${status}`,
    'No command was executed.',
  ];

  if (decision.ruleId) {
    lines.push(`Rule: ${decision.ruleId}`);
  }
  if (decision.reason) {
    lines.push(`Reason: ${decision.reason}`);
  }
  if (decision.approvalRequestId) {
    lines.push(`Approval request: ${decision.approvalRequestId}`);
  }

  return lines.join('\n');
}

function createCommandApprovalRequest(
  decision: CommandSafetyDecision,
  subject: CommandSafetySubject,
  createdAt = new Date().toISOString(),
): CommandApprovalRequest | undefined {
  if (decision.action !== 'require_approval' || !decision.approvalRequestId) {
    return undefined;
  }

  return {
    id: decision.approvalRequestId,
    title: createApprovalTitle(subject),
    reason: decision.reason ?? 'The command requires explicit approval.',
    source: 'commands',
    riskLevel: getApprovalRiskLevel(decision.ruleId),
    ruleId: decision.ruleId,
    subject,
    createdAt,
  };
}

function getExecutableText(subject: CommandSafetySubject): string {
  return [subject.command, subject.interpreter, subject.script]
    .filter((part): part is string => Boolean(part))
    .join('\n');
}

function createApprovalTitle(subject: CommandSafetySubject): string {
  if (subject.toolName === 'run_script') {
    return `Approve script execution: ${subject.interpreter ?? 'unknown interpreter'}`;
  }

  if (subject.toolName === 'prompt/run_command') {
    return `Approve command prompt: ${truncate(subject.command ?? 'unknown command')}`;
  }

  return `Approve command: ${truncate(subject.command ?? 'unknown command')}`;
}

function getApprovalRiskLevel(ruleId?: string): CommandApprovalRiskLevel {
  switch (ruleId) {
    case 'destructive-file-removal':
    case 'disk-or-partition-mutation':
    case 'system-power-action':
      return 'critical';
    case 'destructive-git-operation':
    case 'privileged-or-recursive-permission-change':
    case 'remote-script-execution':
      return 'high';
    default:
      return 'medium';
  }
}

function truncate(value: string): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= 80) {
    return normalized;
  }

  return `${normalized.slice(0, 77)}...`;
}

function matchesPattern(pattern: string, value: string): boolean {
  return new RegExp(pattern, 'im').test(value);
}

function decisionForAction(
  action: Exclude<CommandSafetyAction, 'allow'>,
  subject: CommandSafetySubject,
  reason?: string,
  ruleId?: string,
): CommandSafetyDecision {
  return {
    action,
    reason,
    ruleId,
    approvalRequestId:
      action === 'require_approval'
        ? createApprovalRequestId(subject, ruleId)
        : undefined,
  };
}

function createApprovalRequestId(
  subject: CommandSafetySubject,
  ruleId?: string,
): string {
  return createHash('sha256')
    .update(JSON.stringify({ ...subject, ruleId }))
    .digest('hex')
    .slice(0, 16);
}

export {
  DEFAULT_COMMAND_SAFETY_RULES,
  createCommandApprovalRequest,
  evaluateCommandSafety,
  formatSafetyDecision,
};
export type {
  CommandApprovalRequest,
  CommandApprovalRiskLevel,
  CommandSafetyAction,
  CommandSafetyDecision,
  CommandSafetyPolicyConfig,
  CommandSafetyRule,
  CommandSafetySubject,
};
