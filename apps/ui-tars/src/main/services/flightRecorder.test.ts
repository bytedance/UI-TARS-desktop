/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { GUIAgentData, ShareVersion, StatusEnum } from '@ui-tars/shared/types';
import { Operator } from '@main/store/types';
import { describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => os.tmpdir()),
  },
}));

import { FlightRecorder } from './flightRecorder';

describe('FlightRecorder', () => {
  it('writes a run manifest, event log, and screenshot artifacts', async () => {
    const storageRoot = await mkdtemp(
      path.join(os.tmpdir(), 'proofpilot-flight-recorder-'),
    );
    let idCount = 0;
    const recorder = new FlightRecorder({
      storageRoot,
      now: () => new Date('2026-05-26T00:00:00.000Z'),
      idFactory: () => `id-${++idCount}`,
    });

    const recording = await recorder.startRun({
      sessionId: 'session-1',
      instruction: 'Open the report and summarize it',
      operator: Operator.LocalComputer,
      modelName: 'ui-tars-test',
      modelProvider: 'test-provider',
    });

    const screenshotBase64 = `data:image/png;base64,${Buffer.from(
      'fake-png',
    ).toString('base64')}`;
    await recording.recordAgentData(
      createAgentData({
        status: StatusEnum.RUNNING,
        conversations: [
          {
            from: 'human',
            value: '<image>',
            screenshotBase64,
            screenshotContext: {
              size: {
                width: 1280,
                height: 720,
              },
              mime: 'image/png',
              scaleFactor: 1,
            },
            timing: {
              start: 1,
              end: 2,
              cost: 1,
            },
          },
          {
            from: 'gpt',
            value: 'Click the export button',
            predictionParsed: [
              {
                action_type: 'left_click',
                action_inputs: {
                  start_box: '[10,20,30,40]',
                },
                thought: 'The export button is visible.',
                reflection: null,
              },
            ],
            timing: {
              start: 3,
              end: 4,
              cost: 1,
            },
          },
        ],
      }),
    );
    await recording.finish(StatusEnum.END);

    const manifest = JSON.parse(
      await readFile(path.join(recording.directory, 'manifest.json'), 'utf8'),
    );
    const eventLog = await readFile(
      path.join(recording.directory, 'events.jsonl'),
      'utf8',
    );
    const events = eventLog
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));

    expect(manifest).toMatchObject({
      version: 1,
      sessionId: 'session-1',
      mode: 'live',
      instruction: 'Open the report and summarize it',
      status: StatusEnum.END,
      eventCount: 6,
      artifactCount: 1,
      integrityAlgorithm: 'sha256',
    });
    expect(manifest.recordingHash).toBe(events.at(-1).eventHash);
    expect(events.map((event) => event.type)).toEqual([
      'run_started',
      'status_changed',
      'conversation_added',
      'conversation_added',
      'action_planned',
      'run_finished',
    ]);
    expect(events[0].previousHash).toBeNull();
    expect(events[0].payload.mode).toBe('live');
    expect(events[0].eventHash).toMatch(/^[a-f0-9]{64}$/);
    expect(events[1].previousHash).toBe(events[0].eventHash);
    expect(eventLog).not.toContain(screenshotBase64);

    const screenshot = events.find((event) => event.payload.screenshot)?.payload
      .screenshot;
    await expect(
      stat(path.join(recording.directory, screenshot.relativePath)),
    ).resolves.toBeTruthy();

    const runs = await recorder.listRuns();
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({
      runId: recording.runId,
      storagePath: recording.directory,
      eventCount: 6,
      artifactCount: 1,
    });

    const detail = await recorder.getRun(recording.runId);
    expect(detail?.events.map((event) => event.type)).toEqual([
      'run_started',
      'status_changed',
      'conversation_added',
      'conversation_added',
      'action_planned',
      'run_finished',
    ]);
    expect(detail?.integrity).toMatchObject({
      status: 'verified',
      valid: true,
      verifiedEventCount: 6,
      recordingHash: manifest.recordingHash,
    });
    const screenshotPreview = detail?.events.find(
      (event) => event.payload.screenshot,
    )?.payload.screenshot as { dataUrl?: string };
    expect(screenshotPreview.dataUrl).toBe(screenshotBase64);

    const proofPack = await recorder.exportProofPack(recording.runId);
    const proofPackHtml = await readFile(proofPack.htmlPath, 'utf8');
    const proofPackJson = await readFile(proofPack.jsonPath, 'utf8');
    expect(proofPack.integrity.status).toBe('verified');
    expect(proofPackHtml).toContain('ProofPilot Proof Pack');
    expect(proofPackHtml).toContain('Verified');
    expect(proofPackHtml).toContain(
      'artifacts/screenshots/screenshot_f084b1351c41cf3c.png',
    );
    expect(proofPackJson).not.toContain(screenshotBase64);
    await expect(
      stat(
        path.join(
          proofPack.exportDirectory,
          'artifacts',
          'screenshots',
          'screenshot_f084b1351c41cf3c.png',
        ),
      ),
    ).resolves.toBeTruthy();

    const capsule = await recorder.exportWorkflowCapsule(recording.runId);
    const capsuleJson = JSON.parse(await readFile(capsule.capsulePath, 'utf8'));
    expect(capsule).toMatchObject({
      runId: recording.runId,
      stepCount: 1,
    });
    expect(capsuleJson).toMatchObject({
      version: 1,
      status: 'draft',
      sourceRun: {
        runId: recording.runId,
        mode: 'live',
        recordingHash: manifest.recordingHash,
        integrity: {
          status: 'verified',
        },
      },
      stepCount: 1,
      steps: [
        {
          id: 'step_001',
          actionType: 'left_click',
          actionInputs: {
            start_box: '[10,20,30,40]',
          },
          thought: 'The export button is visible.',
          sourceConversation: {
            message: 'Click the export button',
          },
        },
      ],
    });
    expect(capsuleJson.steps[0].sourceEventHash).toBe(events[4].eventHash);
    expect(JSON.stringify(capsuleJson)).not.toContain(screenshotBase64);

    const compiled = await recorder.compileWorkflow(recording.runId);
    const compiledJson = JSON.parse(
      await readFile(compiled.workflowPath, 'utf8'),
    );
    const compiledMarkdown = await readFile(compiled.markdownPath, 'utf8');
    expect(compiled).toMatchObject({
      runId: recording.runId,
      stepCount: 1,
    });
    expect(compiledJson).toMatchObject({
      version: 1,
      kind: 'proofpilot.workflow',
      status: 'ready_for_simulation',
      sourceRun: {
        runId: recording.runId,
        recordingHash: manifest.recordingHash,
      },
      guardrails: {
        defaultRunMode: 'simulation',
        requireIntegrityVerification: true,
      },
      stepCount: 1,
      steps: [
        {
          id: 'step_001',
          actionType: 'left_click',
          requiresApproval: true,
          evidence: {
            sourceEventHash: events[4].eventHash,
          },
        },
      ],
    });
    expect(compiledJson.workflowId).toMatch(/^[a-f0-9]{16}$/);
    expect(compiledMarkdown).toContain('# Open the report and summarize it');
    expect(compiledMarkdown).toContain('Approval required: yes');

    await expect(recorder.getRun('../outside')).rejects.toThrow(
      'Invalid ProofPilot run id',
    );
  });

  it('records skipped execution events for simulation runs', async () => {
    const storageRoot = await mkdtemp(
      path.join(os.tmpdir(), 'proofpilot-flight-recorder-'),
    );
    let idCount = 0;
    const recorder = new FlightRecorder({
      storageRoot,
      now: () => new Date('2026-05-26T00:00:00.000Z'),
      idFactory: () => `id-${++idCount}`,
    });

    const recording = await recorder.startRun({
      mode: 'simulation',
      instruction: 'Preview the export flow',
      operator: Operator.LocalBrowser,
      modelName: 'ui-tars-test',
      modelProvider: 'test-provider',
    });
    await recording.recordSimulationActionSkipped({
      action_type: 'left_click',
      action_inputs: {
        start_box: '[10,20,30,40]',
      },
      thought: 'The export button should be clicked next.',
      reflection: null,
    });
    await recording.finish(StatusEnum.END);

    const manifest = JSON.parse(
      await readFile(path.join(recording.directory, 'manifest.json'), 'utf8'),
    );
    const detail = await recorder.getRun(recording.runId);
    const proofPack = await recorder.exportProofPack(recording.runId);
    const proofPackHtml = await readFile(proofPack.htmlPath, 'utf8');

    expect(manifest).toMatchObject({
      mode: 'simulation',
      eventCount: 3,
    });
    expect(detail).toMatchObject({
      mode: 'simulation',
      integrity: {
        status: 'verified',
        valid: true,
      },
    });
    expect(detail?.events.map((event) => event.type)).toEqual([
      'run_started',
      'simulation_action_skipped',
      'run_finished',
    ]);
    expect(detail?.events[1].payload).toMatchObject({
      actionType: 'left_click',
      actionInputs: {
        start_box: '[10,20,30,40]',
      },
      thought: 'The export button should be clicked next.',
    });
    expect(proofPackHtml).toContain('simulation');
    expect(proofPackHtml).toContain('Simulation action skipped');
  });

  it('detects tampered event logs', async () => {
    const storageRoot = await mkdtemp(
      path.join(os.tmpdir(), 'proofpilot-flight-recorder-'),
    );
    let idCount = 0;
    const recorder = new FlightRecorder({
      storageRoot,
      now: () => new Date('2026-05-26T00:00:00.000Z'),
      idFactory: () => `id-${++idCount}`,
    });

    const recording = await recorder.startRun({
      instruction: 'Open the report and summarize it',
      operator: Operator.LocalComputer,
    });
    await recording.finish(StatusEnum.END);

    const eventLogPath = path.join(recording.directory, 'events.jsonl');
    const eventLog = await readFile(eventLogPath, 'utf8');
    await writeFile(
      eventLogPath,
      eventLog.replace('Open the report and summarize it', 'Changed task'),
      'utf8',
    );

    const detail = await recorder.getRun(recording.runId);
    expect(detail?.integrity).toMatchObject({
      status: 'failed',
      valid: false,
      failureSequence: 1,
    });
  });
});

function createAgentData(
  partial: Pick<GUIAgentData, 'status' | 'conversations'>,
): GUIAgentData {
  return {
    version: ShareVersion.V1,
    instruction: 'Open the report and summarize it',
    systemPrompt: 'system prompt',
    modelName: 'ui-tars-test',
    logTime: Date.now(),
    status: partial.status,
    conversations: partial.conversations,
  };
}
