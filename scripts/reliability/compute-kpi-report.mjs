#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const CANONICAL_SCENARIO_IDS = new Set([
  'open_cursor',
  'open_settings',
  'focus_existing_browser_window',
  'recover_from_intentional_timeout',
]);

const DEFAULT_MIN_SAMPLE_COUNT = 200;

const OPEN_APP_SCENARIO_IDS = new Set(['open_cursor', 'open_settings']);

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

const getRequiredArg = (args, key) => {
  const value = args[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Missing required argument --${key}`);
  }

  return value.trim();
};

const safeRate = (numerator, denominator) => {
  if (!Number.isFinite(denominator) || denominator <= 0) {
    return null;
  }

  return Number((numerator / denominator).toFixed(6));
};

const normalizeWrongClickToBoolean = (value, rowIndex) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return value > 0;
  }

  throw new Error(
    `Invalid raw-run row ${rowIndex + 1}: 'wrongClick' must be boolean or non-negative number`,
  );
};

const readRequiredString = (value, fieldPath, rowIndex) => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(
      `Invalid raw-run row ${rowIndex + 1}: missing non-empty '${fieldPath}'`,
    );
  }

  return value.trim();
};

const readRequiredBoolean = (value, fieldPath, rowIndex) => {
  if (typeof value !== 'boolean') {
    throw new Error(
      `Invalid raw-run row ${rowIndex + 1}: '${fieldPath}' must be boolean`,
    );
  }

  return value;
};

const extractRowProvenance = (row, rowIndex) => {
  const gitRepo = readRequiredString(
    row?.environment?.git?.repo,
    'environment.git.repo',
    rowIndex,
  );
  const gitBranch = readRequiredString(
    row?.environment?.git?.branch,
    'environment.git.branch',
    rowIndex,
  );
  const gitCommit = readRequiredString(
    row?.environment?.git?.commit,
    'environment.git.commit',
    rowIndex,
  );
  const modelProvider = readRequiredString(
    row?.environment?.model?.provider,
    'environment.model.provider',
    rowIndex,
  );
  const modelName = readRequiredString(
    row?.environment?.model?.name,
    'environment.model.name',
    rowIndex,
  );
  const appVersion = readRequiredString(
    row?.environment?.app?.version,
    'environment.app.version',
    rowIndex,
  );

  return {
    gitRepo,
    gitBranch,
    gitCommit,
    modelProvider,
    modelName,
    appVersion,
  };
};

const extractRowFeatureFlags = (row, rowIndex) => {
  return RELIABILITY_FLAG_FIELDS.reduce((accumulator, fieldName) => {
    accumulator[fieldName] = readRequiredBoolean(
      row?.featureFlags?.[fieldName],
      `featureFlags.${fieldName}`,
      rowIndex,
    );
    return accumulator;
  }, {});
};

const ensureMatchingProvenance = (reference, current, rowIndex) => {
  const fields = [
    ['environment.git.repo', reference.gitRepo, current.gitRepo],
    ['environment.git.branch', reference.gitBranch, current.gitBranch],
    ['environment.git.commit', reference.gitCommit, current.gitCommit],
    [
      'environment.model.provider',
      reference.modelProvider,
      current.modelProvider,
    ],
    ['environment.model.name', reference.modelName, current.modelName],
    ['environment.app.version', reference.appVersion, current.appVersion],
  ];

  for (const [field, expected, actual] of fields) {
    if (expected !== actual) {
      throw new Error(
        `Invalid raw-run row ${rowIndex + 1}: mismatched ${field} ('${actual}' != '${expected}')`,
      );
    }
  }
};

const ensureMatchingFeatureFlags = (reference, current, rowIndex) => {
  for (const fieldName of RELIABILITY_FLAG_FIELDS) {
    const expected = reference[fieldName];
    const actual = current[fieldName];
    if (expected !== actual) {
      throw new Error(
        `Invalid raw-run row ${rowIndex + 1}: mismatched featureFlags.${fieldName} ('${actual}' != '${expected}')`,
      );
    }
  }
};

const parseRepoFromRemote = (remoteUrl) => {
  const trimmed = remoteUrl.trim();
  if (!trimmed) {
    return null;
  }

  const scpLikeMatch = trimmed.match(/^[^@]+@[^:]+:([^\s]+?)(?:\.git)?$/);
  if (scpLikeMatch?.[1]) {
    return scpLikeMatch[1].replace(/^\/+/, '');
  }

  try {
    const parsed = new URL(trimmed);
    const repoPath = parsed.pathname
      .replace(/^\/+/, '')
      .replace(/\.git$/, '');
    return repoPath || null;
  } catch {
    return null;
  }
};

const resolveRepoIdentity = async (explicitRepo) => {
  if (typeof explicitRepo === 'string' && explicitRepo.trim()) {
    return explicitRepo.trim();
  }

  try {
    const { stdout } = await execFileAsync('git', [
      'config',
      '--get',
      'remote.origin.url',
    ]);
    return parseRepoFromRemote(stdout) || 'unknown';
  } catch {
    return 'unknown';
  }
};

const toReportRelativePath = (targetPath, reportPath) => {
  const reportDirectory = path.dirname(path.resolve(reportPath));
  const resolvedTargetPath = path.resolve(targetPath);
  const relativeTargetPath = path.relative(reportDirectory, resolvedTargetPath);
  if (relativeTargetPath && relativeTargetPath.length > 0) {
    return relativeTargetPath;
  }

  return path.basename(resolvedTargetPath);
};

const ensureRow = (row, rowIndex) => {
  const requiredStringFields = [
    'runId',
    'timestamp',
    'scenarioId',
    'sessionId',
    'finalStatus',
  ];

  for (const field of requiredStringFields) {
    if (typeof row[field] !== 'string' || row[field].trim().length === 0) {
      throw new Error(
        `Invalid raw-run row ${rowIndex + 1}: missing non-empty '${field}'`,
      );
    }
  }

  if (!CANONICAL_SCENARIO_IDS.has(row.scenarioId)) {
    throw new Error(
      `Invalid raw-run row ${rowIndex + 1}: unknown scenarioId '${row.scenarioId}'`,
    );
  }

  normalizeWrongClickToBoolean(row.wrongClick, rowIndex);

  const requiredBooleanFields = ['maxLoopTermination', 'authHardFailure'];

  for (const field of requiredBooleanFields) {
    if (typeof row[field] !== 'boolean') {
      throw new Error(
        `Invalid raw-run row ${rowIndex + 1}: '${field}' must be boolean`,
      );
    }
  }

  if (
    OPEN_APP_SCENARIO_IDS.has(row.scenarioId) &&
    typeof row.openAppFirstAttemptSuccess !== 'boolean'
  ) {
    throw new Error(
      `Invalid raw-run row ${rowIndex + 1}: 'openAppFirstAttemptSuccess' must be boolean for ${row.scenarioId}`,
    );
  }
};

const parseAsJsonArray = (trimmedContent) => {
  try {
    const parsed = JSON.parse(trimmedContent);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const readRawRuns = async (rawPath) => {
  const content = await fs.readFile(rawPath, 'utf8');
  const trimmedContent = content.trim();
  if (!trimmedContent) {
    throw new Error('Raw runs artifact is empty');
  }

  const parsedArray = parseAsJsonArray(trimmedContent);
  if (parsedArray) {
    return parsedArray.map((row, index) => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        throw new Error(
          `Invalid raw-run row ${index + 1}: row must be a JSON object`,
        );
      }
      ensureRow(row, index);
      return row;
    });
  }

  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return lines.map((line, index) => {
    const row = JSON.parse(line);
    ensureRow(row, index);
    return row;
  });
};

const main = async () => {
  const args = parseArgs();
  const rawPath = args.raw;
  const outputPath = args.out;

  if (!rawPath || !outputPath) {
    throw new Error(
      'Usage: node scripts/reliability/compute-kpi-report.mjs --raw <raw.ndjson> --out <report.json> [--runId <id>] [--repo <owner/repo>] [--branch <name>] [--commit <sha>] [--provider <name>] [--model <name>] [--appVersion <version>] [--runType <baseline|gate>] [--minSampleCount <n>]',
    );
  }

  const branch = getRequiredArg(args, 'branch');
  const commit = getRequiredArg(args, 'commit');
  const provider = getRequiredArg(args, 'provider');
  const model = getRequiredArg(args, 'model');
  const appVersion = getRequiredArg(args, 'appVersion');

  const rows = await readRawRuns(rawPath);
  const rowProvenance = rows.map((row, index) => {
    return extractRowProvenance(row, index);
  });
  const referenceProvenance = rowProvenance[0];
  if (!referenceProvenance) {
    throw new Error('Raw runs artifact must include at least one row');
  }

  rowProvenance.slice(1).forEach((provenance, index) => {
    ensureMatchingProvenance(referenceProvenance, provenance, index + 1);
  });

  const rowFeatureFlags = rows.map((row, index) => {
    return extractRowFeatureFlags(row, index);
  });
  const referenceFeatureFlags = rowFeatureFlags[0];
  if (!referenceFeatureFlags) {
    throw new Error('Raw runs artifact must include at least one row');
  }

  rowFeatureFlags.slice(1).forEach((featureFlags, index) => {
    ensureMatchingFeatureFlags(referenceFeatureFlags, featureFlags, index + 1);
  });

  const openAppRows = rows.filter((row) => OPEN_APP_SCENARIO_IDS.has(row.scenarioId));
  const openAppSuccessCount = openAppRows.filter(
    (row) => row.openAppFirstAttemptSuccess === true,
  ).length;

  const normalizedWrongClickCount = rows.filter((row, rowIndex) => {
    return normalizeWrongClickToBoolean(row.wrongClick, rowIndex);
  }).length;

  const maxLoopCount = rows.filter(
    (row) => row.maxLoopTermination === true,
  ).length;

  const authHardFailureCount = rows.filter(
    (row) => row.authHardFailure === true,
  ).length;

  const openAppFirstAttemptSuccessRate = safeRate(
    openAppSuccessCount,
    openAppRows.length,
  );
  const wrongClickRate = safeRate(normalizedWrongClickCount, rows.length);
  const maxLoopTerminationRate = safeRate(maxLoopCount, rows.length);
  const authHardFailureRate = safeRate(authHardFailureCount, rows.length);

  const requestedMinSampleCount = Number(args.minSampleCount);
  const minSampleCount =
    Number.isFinite(requestedMinSampleCount) && requestedMinSampleCount > 0
      ? Math.max(DEFAULT_MIN_SAMPLE_COUNT, requestedMinSampleCount)
      : DEFAULT_MIN_SAMPLE_COUNT;

  const repoIdentity = await resolveRepoIdentity(args.repo);
  if (!repoIdentity || repoIdentity === 'unknown') {
    throw new Error(
      'Unable to resolve repository identity. Provide --repo <owner/repo>.',
    );
  }

  if (referenceProvenance.gitRepo !== repoIdentity) {
    throw new Error(
      `CLI --repo (${repoIdentity}) does not match row provenance (${referenceProvenance.gitRepo})`,
    );
  }

  if (referenceProvenance.gitBranch !== branch) {
    throw new Error(
      `CLI --branch (${branch}) does not match row provenance (${referenceProvenance.gitBranch})`,
    );
  }

  if (referenceProvenance.gitCommit !== commit) {
    throw new Error(
      `CLI --commit (${commit}) does not match row provenance (${referenceProvenance.gitCommit})`,
    );
  }

  if (referenceProvenance.modelProvider !== provider) {
    throw new Error(
      `CLI --provider (${provider}) does not match row provenance (${referenceProvenance.modelProvider})`,
    );
  }

  if (referenceProvenance.modelName !== model) {
    throw new Error(
      `CLI --model (${model}) does not match row provenance (${referenceProvenance.modelName})`,
    );
  }

  if (referenceProvenance.appVersion !== appVersion) {
    throw new Error(
      `CLI --appVersion (${appVersion}) does not match row provenance (${referenceProvenance.appVersion})`,
    );
  }

  const openAppPass =
    openAppFirstAttemptSuccessRate !== null && openAppFirstAttemptSuccessRate >= 0.95;
  const wrongClickPass = wrongClickRate !== null && wrongClickRate < 0.01;
  const scenarioCounts = rows.reduce((accumulator, row) => {
    accumulator[row.scenarioId] = (accumulator[row.scenarioId] || 0) + 1;
    return accumulator;
  }, {});

  const missingScenarioIds = [...CANONICAL_SCENARIO_IDS].filter(
    (scenarioId) => !scenarioCounts[scenarioId],
  );
  const sampleCountPass = rows.length >= minSampleCount;
  const scenarioCoveragePass = missingScenarioIds.length === 0;
  const coveragePass = sampleCountPass && scenarioCoveragePass;
  const allPass = openAppPass && wrongClickPass && coveragePass;
  const reportRelativeRawRunsPath = toReportRelativePath(rawPath, outputPath);

  const report = {
    reportVersion: 'v1',
    generatedAt: new Date().toISOString(),
    scope: {
      runId: args.runId || path.parse(outputPath).name,
      runType: args.runType || 'baseline',
      sampleCount: rows.length,
      scenarios: [...CANONICAL_SCENARIO_IDS],
      scenarioCounts,
    },
    environment: {
      platform: args.platform || process.platform,
      git: {
        repo: repoIdentity,
        branch,
        commit,
      },
      model: {
        provider,
        name: model,
      },
      app: {
        version: appVersion,
      },
      featureFlags: referenceFeatureFlags,
    },
    metrics: {
      openAppFirstAttemptSuccessRate,
      wrongClickRate,
      maxLoopTerminationRate,
      authHardFailureRate,
    },
    targets: {
      openAppFirstAttemptSuccessRate: '>=0.95',
      wrongClickRate: '<0.01',
    },
    targetResult: {
      openAppFirstAttemptSuccessRatePass: openAppPass,
      wrongClickRatePass: wrongClickPass,
      sampleCountPass,
      scenarioCoveragePass,
      coveragePass,
      minSampleCount,
      missingScenarioIds,
      allPass,
    },
    executionStatus: {
      state: 'executed',
      rawRunsPath: reportRelativeRawRunsPath,
    },
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  process.stdout.write(
    `KPI report generated: ${outputPath} (allPass=${report.targetResult.allPass})\n`,
  );
};

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
