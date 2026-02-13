#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const RELIABILITY_FLAG_FIELDS = [
  'ffToolRegistry',
  'ffInvokeGate',
  'ffToolFirstRouting',
  'ffConfidenceLayer',
  'ffLoopGuardrails',
];

const parseArgs = () => {
  const args = process.argv.slice(2);
  const result = {};

  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    const value = args[index + 1];
    if (!key.startsWith('--') || value == null || value.startsWith('--')) {
      continue;
    }
    result[key.slice(2)] = value;
    index += 1;
  }

  return result;
};

const readReport = async (filePath) => {
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content);
};

const isPassingReport = (report) => {
  return (
    report?.executionStatus?.state === 'executed' &&
    report?.targetResult?.coveragePass === true &&
    report?.targetResult?.allPass === true
  );
};

const getRunId = (report) => {
  if (typeof report?.scope?.runId === 'string' && report.scope.runId.trim()) {
    return report.scope.runId;
  }

  return null;
};

const getRequiredMetadata = (report, reportLabel) => {
  const gitRepo = report?.environment?.git?.repo;
  const gitBranch = report?.environment?.git?.branch;
  const gitCommit = report?.environment?.git?.commit;
  const modelProvider = report?.environment?.model?.provider;
  const modelName = report?.environment?.model?.name;
  const appVersion = report?.environment?.app?.version;

  const requiredEntries = [
    ['environment.git.repo', gitRepo],
    ['environment.git.branch', gitBranch],
    ['environment.git.commit', gitCommit],
    ['environment.model.provider', modelProvider],
    ['environment.model.name', modelName],
    ['environment.app.version', appVersion],
  ];

  for (const [field, value] of requiredEntries) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error(`${reportLabel} is missing required ${field}`);
    }
  }

  return {
    gitRepo,
    gitBranch,
    gitCommit,
    modelProvider,
    modelName,
    appVersion,
  };
};

const getRequiredFeatureFlags = (report, reportLabel) => {
  const featureFlags = {};

  for (const fieldName of RELIABILITY_FLAG_FIELDS) {
    const value = report?.environment?.featureFlags?.[fieldName];
    if (typeof value !== 'boolean') {
      throw new Error(
        `${reportLabel} is missing required environment.featureFlags.${fieldName}`,
      );
    }
    featureFlags[fieldName] = value;
  }

  return featureFlags;
};

const ensureMatchingFeatureFlags = (firstFlags, secondFlags) => {
  for (const fieldName of RELIABILITY_FLAG_FIELDS) {
    if (firstFlags[fieldName] !== secondFlags[fieldName]) {
      throw new Error(
        `KPI gate requires matching environment.featureFlags.${fieldName} across both reports ('${firstFlags[fieldName]}' vs '${secondFlags[fieldName]}')`,
      );
    }
  }
};

const getRequiredRawRunsPath = (report, reportLabel) => {
  const rawRunsPath = report?.executionStatus?.rawRunsPath;
  if (typeof rawRunsPath !== 'string' || rawRunsPath.trim().length === 0) {
    throw new Error(`${reportLabel} is missing required executionStatus.rawRunsPath`);
  }

  return rawRunsPath.trim();
};

const normalizePathForComparison = (rawRunsPath, reportFilePath) => {
  const reportDirectory = path.dirname(path.resolve(reportFilePath));
  const resolvedPath = path.isAbsolute(rawRunsPath)
    ? path.normalize(rawRunsPath)
    : path.resolve(reportDirectory, rawRunsPath);
  if (process.platform === 'win32') {
    return resolvedPath.toLowerCase();
  }

  return resolvedPath;
};

const ensureMatchingMetadata = (firstMeta, secondMeta) => {
  const checks = [
    ['environment.git.repo', firstMeta.gitRepo, secondMeta.gitRepo],
    ['environment.git.branch', firstMeta.gitBranch, secondMeta.gitBranch],
    ['environment.git.commit', firstMeta.gitCommit, secondMeta.gitCommit],
    [
      'environment.model.provider',
      firstMeta.modelProvider,
      secondMeta.modelProvider,
    ],
    ['environment.model.name', firstMeta.modelName, secondMeta.modelName],
    ['environment.app.version', firstMeta.appVersion, secondMeta.appVersion],
  ];

  for (const [field, firstValue, secondValue] of checks) {
    if (firstValue !== secondValue) {
      throw new Error(
        `KPI gate requires matching ${field} across both reports ('${firstValue}' vs '${secondValue}')`,
      );
    }
  }
};

const main = async () => {
  const args = parseArgs();
  const firstPath = args.first;
  const secondPath = args.second;

  if (!firstPath || !secondPath) {
    throw new Error(
      'Usage: node scripts/reliability/check-kpi-gate.mjs --first <run1.report.json> --second <run2.report.json>',
    );
  }

  const firstResolvedPath = path.resolve(firstPath);
  const secondResolvedPath = path.resolve(secondPath);
  if (firstResolvedPath === secondResolvedPath) {
    throw new Error('KPI gate requires two distinct report files');
  }

  const [first, second] = await Promise.all([
    readReport(firstPath),
    readReport(secondPath),
  ]);

  const firstRunId = getRunId(first);
  const secondRunId = getRunId(second);
  if (!firstRunId || !secondRunId) {
    throw new Error('Each KPI report must include a non-empty scope.runId');
  }

  if (firstRunId === secondRunId) {
    throw new Error(
      `KPI gate requires different runId values (both were '${firstRunId}')`,
    );
  }

  const firstMetadata = getRequiredMetadata(first, 'first report');
  const secondMetadata = getRequiredMetadata(second, 'second report');
  ensureMatchingMetadata(firstMetadata, secondMetadata);

  const firstFeatureFlags = getRequiredFeatureFlags(first, 'first report');
  const secondFeatureFlags = getRequiredFeatureFlags(second, 'second report');
  ensureMatchingFeatureFlags(firstFeatureFlags, secondFeatureFlags);

  const firstRawRunsPath = getRequiredRawRunsPath(first, 'first report');
  const secondRawRunsPath = getRequiredRawRunsPath(second, 'second report');
  const firstResolvedRawRunsPath = normalizePathForComparison(
    firstRawRunsPath,
    firstResolvedPath,
  );
  const secondResolvedRawRunsPath = normalizePathForComparison(
    secondRawRunsPath,
    secondResolvedPath,
  );
  if (
    firstResolvedRawRunsPath === secondResolvedRawRunsPath
  ) {
    throw new Error(
      `KPI gate requires different executionStatus.rawRunsPath values (both resolve to '${firstResolvedRawRunsPath}')`,
    );
  }

  const firstPass = isPassingReport(first);
  const secondPass = isPassingReport(second);
  const gatePass = firstPass && secondPass;

  const summary = {
    version: 'v1',
    checkedAt: new Date().toISOString(),
    reports: {
      first: {
        path: firstPath,
        runId: firstRunId,
        rawRunsPath: firstRawRunsPath,
        ok: firstPass,
      },
      second: {
        path: secondPath,
        runId: secondRunId,
        rawRunsPath: secondRawRunsPath,
        ok: secondPass,
      },
    },
    gatePass,
  };

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);

  if (!gatePass) {
    process.exit(1);
  }
};

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
