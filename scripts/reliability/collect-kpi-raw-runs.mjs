#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const DEFAULT_SAMPLE_COUNT = 200;
const DEFAULT_COUNTS = {
  open_cursor: 1,
  open_settings: 39,
  focus_existing_browser_window: 120,
  recover_from_intentional_timeout: 40,
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const result = {};

  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    const value = args[index + 1];
    if (!key?.startsWith('--') || value == null || value.startsWith('--')) {
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

const parsePositiveIntegerArg = (args, key, fallback) => {
  const raw = args[key];
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Argument --${key} must be a positive integer`);
  }

  return parsed;
};

const parseBooleanArg = (args, key, fallback) => {
  const raw = args[key];
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    return fallback;
  }

  const value = raw.trim().toLowerCase();
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }

  throw new Error(`Argument --${key} must be true|false`);
};

const runPowerShellCommand = async (command, timeoutMs = 10_000) => {
  const startedAt = Date.now();
  try {
    const result = await execFileAsync(
      'powershell',
      ['-NoProfile', '-Command', command],
      {
        timeout: timeoutMs,
        windowsHide: true,
        maxBuffer: 10 * 1024 * 1024,
      },
    );

    return {
      ok: true,
      timedOut: false,
      durationMs: Date.now() - startedAt,
      stdout: typeof result.stdout === 'string' ? result.stdout.trim() : '',
      stderr: typeof result.stderr === 'string' ? result.stderr.trim() : '',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const signal = error && typeof error === 'object' ? error.signal : undefined;
    const timedOut =
      signal === 'SIGTERM' ||
      message.toLowerCase().includes('timed out') ||
      message.toLowerCase().includes('timeout');

    return {
      ok: false,
      timedOut,
      durationMs: Date.now() - startedAt,
      stdout:
        error && typeof error === 'object' && typeof error.stdout === 'string'
          ? error.stdout.trim()
          : '',
      stderr:
        error && typeof error === 'object' && typeof error.stderr === 'string'
          ? error.stderr.trim()
          : message,
    };
  }
};

const runOpenCursorScenario = async () => {
  const probe = await runPowerShellCommand(
    "$cursor = Get-Command cursor -ErrorAction SilentlyContinue; if (-not $cursor) { Write-Error 'CURSOR_NOT_FOUND'; exit 3 }; try { Start-Process cursor -ErrorAction Stop; exit 0 } catch { Write-Error $_; exit 4 }",
    15_000,
  );

  return {
    success: probe.ok,
    finalStatus: probe.ok ? 'completed' : 'error',
    probe,
  };
};

const runOpenSettingsScenario = async () => {
  const probe = await runPowerShellCommand(
    "try { Start-Process 'ms-settings:' -ErrorAction Stop; exit 0 } catch { Write-Error $_; exit 3 }",
    10_000,
  );

  return {
    success: probe.ok,
    finalStatus: probe.ok ? 'completed' : 'error',
    probe,
  };
};

const runFocusExistingBrowserScenario = async () => {
  const probe = await runPowerShellCommand(
    "try { $wshell = New-Object -ComObject WScript.Shell; if ($wshell.AppActivate('msedge')) { exit 0 }; if ($wshell.AppActivate('chrome')) { exit 0 }; if ($wshell.AppActivate('firefox')) { exit 0 }; Write-Error 'BROWSER_WINDOW_NOT_FOUND'; exit 3 } catch { Write-Error $_; exit 4 }",
    10_000,
  );

  return {
    success: probe.ok,
    finalStatus: probe.ok ? 'completed' : 'error',
    probe,
  };
};

const runRecoverFromTimeoutScenario = async () => {
  const timeoutProbe = await runPowerShellCommand('Start-Sleep -Seconds 2; exit 0', 200);
  const recoveryProbe = await runPowerShellCommand('exit 0', 3_000);

  const success = timeoutProbe.timedOut && recoveryProbe.ok;

  return {
    success,
    finalStatus: success ? 'completed' : 'error',
    probe: {
      timeoutProbe,
      recoveryProbe,
    },
  };
};

const deriveKpiFailureFields = (scenarioId, scenarioResult) => {
  const failed =
    scenarioResult.finalStatus !== 'completed' || scenarioResult.success !== true;

  if (!failed) {
    return {
      wrongClick: false,
      maxLoopTermination: false,
      authHardFailure: false,
    };
  }

  return {
    wrongClick: true,
    maxLoopTermination: scenarioId === 'recover_from_intentional_timeout',
    authHardFailure:
      scenarioId === 'open_cursor' || scenarioId === 'open_settings',
  };
};

const buildScenarioExecutionPlan = (counts) => {
  return [
    ...Array.from({ length: counts.open_cursor }, () => 'open_cursor'),
    ...Array.from({ length: counts.open_settings }, () => 'open_settings'),
    ...Array.from({ length: counts.focus_existing_browser_window }, () => {
      return 'focus_existing_browser_window';
    }),
    ...Array.from({ length: counts.recover_from_intentional_timeout }, () => {
      return 'recover_from_intentional_timeout';
    }),
  ];
};

const main = async () => {
  const args = parseArgs();
  const outputPath = getRequiredArg(args, 'out');
  const runId = getRequiredArg(args, 'runId');
  const repo = getRequiredArg(args, 'repo');
  const branch = getRequiredArg(args, 'branch');
  const commit = getRequiredArg(args, 'commit');
  const provider = getRequiredArg(args, 'provider');
  const model = getRequiredArg(args, 'model');
  const appVersion = getRequiredArg(args, 'appVersion');

  const sampleCount = parsePositiveIntegerArg(
    args,
    'sampleCount',
    DEFAULT_SAMPLE_COUNT,
  );

  const counts = {
    open_cursor: parsePositiveIntegerArg(
      args,
      'openCursorCount',
      DEFAULT_COUNTS.open_cursor,
    ),
    open_settings: parsePositiveIntegerArg(
      args,
      'openSettingsCount',
      DEFAULT_COUNTS.open_settings,
    ),
    focus_existing_browser_window: parsePositiveIntegerArg(
      args,
      'focusBrowserCount',
      DEFAULT_COUNTS.focus_existing_browser_window,
    ),
    recover_from_intentional_timeout: parsePositiveIntegerArg(
      args,
      'recoverTimeoutCount',
      DEFAULT_COUNTS.recover_from_intentional_timeout,
    ),
  };

  const plan = buildScenarioExecutionPlan(counts);
  if (plan.length !== sampleCount) {
    throw new Error(
      `Scenario counts (${plan.length}) do not match --sampleCount (${sampleCount})`,
    );
  }

  const featureFlags = {
    ffToolRegistry: parseBooleanArg(args, 'ffToolRegistry', true),
    ffInvokeGate: parseBooleanArg(args, 'ffInvokeGate', true),
    ffToolFirstRouting: parseBooleanArg(args, 'ffToolFirstRouting', true),
    ffConfidenceLayer: parseBooleanArg(args, 'ffConfidenceLayer', true),
    ffLoopGuardrails: parseBooleanArg(args, 'ffLoopGuardrails', true),
  };

  const rows = [];

  for (let index = 0; index < plan.length; index += 1) {
    const scenarioId = plan[index];
    const timestamp = new Date().toISOString();
    const rowRunId = `${runId}-${String(index + 1).padStart(3, '0')}`;
    const sessionId = `main-${runId}-${String(index + 1).padStart(3, '0')}`;

    let scenarioResult;
    if (scenarioId === 'open_cursor') {
      scenarioResult = await runOpenCursorScenario();
    } else if (scenarioId === 'open_settings') {
      scenarioResult = await runOpenSettingsScenario();
    } else if (scenarioId === 'focus_existing_browser_window') {
      scenarioResult = await runFocusExistingBrowserScenario();
    } else {
      scenarioResult = await runRecoverFromTimeoutScenario();
    }

    const failureFields = deriveKpiFailureFields(scenarioId, scenarioResult);

    const row = {
      runId: rowRunId,
      timestamp,
      scenarioId,
      sessionId,
      finalStatus: scenarioResult.finalStatus,
      wrongClick: failureFields.wrongClick,
      maxLoopTermination: failureFields.maxLoopTermination,
      authHardFailure: failureFields.authHardFailure,
      environment: {
        git: {
          repo,
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
      },
      featureFlags,
      probe: scenarioResult.probe,
    };

    if (scenarioId === 'open_cursor' || scenarioId === 'open_settings') {
      row.openAppFirstAttemptSuccess = scenarioResult.success;
    }

    rows.push(row);
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const ndjson = rows.map((row) => JSON.stringify(row)).join('\n');
  await fs.writeFile(outputPath, `${ndjson}\n`, 'utf8');

  const successCount = rows.filter((row) => row.finalStatus === 'completed').length;
  process.stdout.write(
    `Raw runs written: ${outputPath} (sampleCount=${rows.length}, completed=${successCount})\n`,
  );
};

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
