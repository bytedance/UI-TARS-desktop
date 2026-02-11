/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { app, desktopCapturer } from 'electron';

import { logger } from '@main/logger';
import { getScreenSize } from '@main/utils/screen';
import { redactSensitiveData } from '@main/utils/redactSensitiveData';
import { sleep } from '@ui-tars/shared/utils';
import { NutJSElectronOperator } from '@main/agent/operator';
import type { ActionInputs } from '@ui-tars/shared/types';

const SKILL_FILE_SUFFIX = '.skill.json';
const MAX_SCREENSHOT_BYTES = 8 * 1024 * 1024;

export type TeachSkillStepInput = {
  id: string;
  title: string;
  explanation?: string;
  expectedOutcome?: string;
  capturedAt: string;
  screenshotBase64: string;
  actionType?: string;
  actionInputs?: Record<string, unknown>;
};

export type TeachSkillSaveInput = {
  id?: string;
  name: string;
  goal: string;
  plan?: string;
  model: string;
  steps: TeachSkillStepInput[];
};

export type TeachSkillPortable = TeachSkillSaveInput & {
  id: string;
};

export type TeachSkillStepRecord = Omit<
  TeachSkillStepInput,
  'screenshotBase64'
> & {
  assetPath: string;
};

export type TeachSkillRecord = {
  version: number;
  id: string;
  name: string;
  goal: string;
  plan?: string;
  model: string;
  assetsDir: string;
  createdAt: string;
  updatedAt: string;
  steps: TeachSkillStepRecord[];
};

export type TeachSkillSummary = {
  id: string;
  name: string;
  goal: string;
  model: string;
  createdAt: string;
  updatedAt: string;
  stepCount: number;
};

export type TeachSkillReplayResult = {
  skillId: string;
  totalSteps: number;
  executedSteps: number;
  skippedSteps: number;
};

export type TeachSkillDeleteResult = {
  id: string;
  deleted: boolean;
};

export type TeachSnapshot = {
  base64: string;
  mime: 'image/jpeg';
  width: number;
  height: number;
  scaleFactor: number;
};

const getTeachRootDir = () => {
  return path.join(app.getPath('userData'), 'skills', 'teach');
};

const getTeachAssetsRootDir = () => {
  return path.join(getTeachRootDir(), 'assets');
};

const resolveTeachAssetsDirPath = (assetsDir: string) => {
  const teachRootDir = getTeachRootDir();
  const teachAssetsRootDir = getTeachAssetsRootDir();
  const assetsDirPath = path.resolve(teachRootDir, assetsDir);
  const relativeAssetsPath = path.relative(teachAssetsRootDir, assetsDirPath);

  if (
    !relativeAssetsPath ||
    relativeAssetsPath === '.' ||
    relativeAssetsPath.startsWith('..') ||
    path.isAbsolute(relativeAssetsPath)
  ) {
    throw new Error('Teach skill assets directory is invalid');
  }

  return assetsDirPath;
};

const resolveTeachAssetFilePath = (assetsDir: string, assetPath: string) => {
  const teachRootDir = getTeachRootDir();
  const assetsDirPath = resolveTeachAssetsDirPath(assetsDir);
  const assetFilePath = path.resolve(teachRootDir, assetPath);
  const relativeAssetPath = path.relative(assetsDirPath, assetFilePath);

  if (
    !relativeAssetPath ||
    relativeAssetPath.startsWith('..') ||
    path.isAbsolute(relativeAssetPath)
  ) {
    throw new Error('Teach skill asset path is invalid');
  }

  return assetFilePath;
};

const toSkillFileName = (skillId: string) => `${skillId}${SKILL_FILE_SUFFIX}`;

const parseDataUrl = (input: string) => {
  const dataUrlMatch = input.match(
    /^data:(?<mime>[^;]+);base64,(?<payload>.+)$/,
  );
  if (dataUrlMatch?.groups?.payload) {
    return {
      mime: dataUrlMatch.groups.mime,
      base64: dataUrlMatch.groups.payload,
    };
  }

  return {
    mime: 'image/jpeg',
    base64: input,
  };
};

const getDecodedBase64ByteLength = (rawBase64: string) => {
  const base64 = rawBase64.replace(/\s+/g, '');
  if (!base64) {
    return 0;
  }

  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
};

const sanitizeSkillId = (rawId?: string) => {
  const safe = (rawId || '').trim().replace(/[^a-zA-Z0-9_-]/g, '-');
  if (safe.length > 0) {
    return safe;
  }
  return randomUUID();
};

const sanitizeText = (value?: string) => {
  const result = (value || '').trim();
  if (!result) {
    return '';
  }

  return redactSensitiveData(result);
};

const normalizeActionInputs = (
  value?: Record<string, unknown>,
): ActionInputs => {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const allowedStringKeys = [
    'content',
    'start_box',
    'end_box',
    'key',
    'hotkey',
    'direction',
  ] as const;

  const normalized: ActionInputs = {};

  for (const key of allowedStringKeys) {
    const raw = value[key];
    if (typeof raw === 'string') {
      normalized[key] = raw;
    }
  }

  if (
    Array.isArray(value.start_coords) &&
    value.start_coords.length === 2 &&
    typeof value.start_coords[0] === 'number' &&
    typeof value.start_coords[1] === 'number'
  ) {
    normalized.start_coords = value.start_coords as [number, number];
  }

  if (
    Array.isArray(value.end_coords) &&
    value.end_coords.length === 2 &&
    typeof value.end_coords[0] === 'number' &&
    typeof value.end_coords[1] === 'number'
  ) {
    normalized.end_coords = value.end_coords as [number, number];
  }

  return normalized;
};

const ensureTeachDirs = async () => {
  await fs.mkdir(getTeachRootDir(), { recursive: true });
  await fs.mkdir(getTeachAssetsRootDir(), { recursive: true });
};

const toSummary = (record: TeachSkillRecord): TeachSkillSummary => {
  return {
    id: record.id,
    name: record.name,
    goal: record.goal,
    model: record.model,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    stepCount: record.steps.length,
  };
};

export const captureTeachSnapshot = async (): Promise<TeachSnapshot> => {
  const { physicalSize, scaleFactor, id: primaryDisplayId } = getScreenSize();

  const targetWidth = Math.max(1, Math.round(physicalSize.width));
  const targetHeight = Math.max(1, Math.round(physicalSize.height));

  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: {
      width: targetWidth,
      height: targetHeight,
    },
  });

  const primarySource =
    sources.find(
      (source) => source.display_id === primaryDisplayId.toString(),
    ) || sources[0];

  if (!primarySource) {
    throw new Error('Unable to capture primary display snapshot');
  }

  const sourceSize = primarySource.thumbnail.getSize();
  const image =
    sourceSize.width === targetWidth && sourceSize.height === targetHeight
      ? primarySource.thumbnail
      : primarySource.thumbnail.resize({
          width: targetWidth,
          height: targetHeight,
        });

  return {
    base64: image.toJPEG(75).toString('base64'),
    mime: 'image/jpeg',
    width: targetWidth,
    height: targetHeight,
    scaleFactor,
  };
};

export const saveTeachSkill = async (
  input: TeachSkillSaveInput,
): Promise<TeachSkillSummary> => {
  if (!input.steps.length) {
    throw new Error('Teach skill requires at least one recorded step');
  }

  await ensureTeachDirs();

  const now = new Date().toISOString();
  const skillId = sanitizeSkillId(input.id);
  const assetsDirRelative = path.join('assets', skillId);
  const assetsDirAbsolute = path.join(getTeachRootDir(), assetsDirRelative);
  const skillFilePath = path.join(getTeachRootDir(), toSkillFileName(skillId));

  await fs.mkdir(assetsDirAbsolute, { recursive: true });

  const steps: TeachSkillStepRecord[] = [];
  const expectedAssetFileNames = new Set<string>();

  for (let i = 0; i < input.steps.length; i += 1) {
    const step = input.steps[i];
    const parsed = parseDataUrl(step.screenshotBase64);

    if (getDecodedBase64ByteLength(parsed.base64) > MAX_SCREENSHOT_BYTES) {
      throw new Error(
        `Step ${i + 1} screenshot exceeds ${MAX_SCREENSHOT_BYTES} bytes`,
      );
    }

    const imageBuffer = Buffer.from(parsed.base64, 'base64');

    if (imageBuffer.byteLength > MAX_SCREENSHOT_BYTES) {
      throw new Error(
        `Step ${i + 1} screenshot exceeds ${MAX_SCREENSHOT_BYTES} bytes`,
      );
    }

    const imageFileName = `step-${String(i + 1).padStart(3, '0')}.jpg`;
    const imageFileRelativePath = path.join(assetsDirRelative, imageFileName);
    const imageFileAbsolutePath = path.join(assetsDirAbsolute, imageFileName);
    expectedAssetFileNames.add(imageFileName);

    await fs.writeFile(imageFileAbsolutePath, imageBuffer);

    steps.push({
      id: step.id,
      title: sanitizeText(step.title) || `Step ${i + 1}`,
      explanation: sanitizeText(step.explanation),
      expectedOutcome: sanitizeText(step.expectedOutcome),
      capturedAt: step.capturedAt,
      assetPath: imageFileRelativePath.replace(/\\/g, '/'),
      actionType: sanitizeText(step.actionType),
      actionInputs:
        step.actionInputs && typeof step.actionInputs === 'object'
          ? step.actionInputs
          : {},
    });
  }

  const existingAssetFileNames = await fs.readdir(assetsDirAbsolute);
  await Promise.all(
    existingAssetFileNames
      .filter((fileName) => !expectedAssetFileNames.has(fileName))
      .map((fileName) =>
        fs.rm(path.join(assetsDirAbsolute, fileName), {
          force: true,
          recursive: true,
        }),
      ),
  );

  let createdAt = now;
  const existing = await getTeachSkill(skillId);
  if (existing) {
    createdAt = existing.createdAt;
  }

  const record: TeachSkillRecord = {
    version: 1,
    id: skillId,
    name: sanitizeText(input.name) || 'Untitled teach skill',
    goal: sanitizeText(input.goal),
    plan: sanitizeText(input.plan),
    model: sanitizeText(input.model),
    assetsDir: assetsDirRelative.replace(/\\/g, '/'),
    createdAt,
    updatedAt: now,
    steps,
  };

  await fs.writeFile(skillFilePath, JSON.stringify(record, null, 2), 'utf-8');

  logger.info('[TeachSkills] Saved skill', {
    skillId,
    stepCount: record.steps.length,
    filePath: skillFilePath,
  });

  return toSummary(record);
};

export const listTeachSkills = async (): Promise<TeachSkillSummary[]> => {
  await ensureTeachDirs();
  const files = await fs.readdir(getTeachRootDir());
  const skillFiles = files.filter((fileName) =>
    fileName.endsWith(SKILL_FILE_SUFFIX),
  );

  const records = await Promise.all(
    skillFiles.map(async (fileName) => {
      try {
        const filePath = path.join(getTeachRootDir(), fileName);
        const content = await fs.readFile(filePath, 'utf-8');
        const record = JSON.parse(content) as TeachSkillRecord;
        return toSummary(record);
      } catch (error) {
        logger.warn('[TeachSkills] Failed to read skill file', {
          fileName,
          error,
        });
        return null;
      }
    }),
  );

  return records
    .filter((item): item is TeachSkillSummary => !!item)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
};

export const getTeachSkill = async (
  skillId: string,
): Promise<TeachSkillRecord | null> => {
  try {
    const safeSkillId = sanitizeSkillId(skillId);
    const filePath = path.join(getTeachRootDir(), toSkillFileName(safeSkillId));
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as TeachSkillRecord;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
};

export const replayTeachSkill = async (
  skillId: string,
): Promise<TeachSkillReplayResult> => {
  const skill = await getTeachSkill(skillId);
  if (!skill) {
    throw new Error(`Teach skill not found: ${skillId}`);
  }

  const operator = new NutJSElectronOperator();
  const { physicalSize, scaleFactor } = getScreenSize();

  let executedSteps = 0;
  let skippedSteps = 0;

  for (const step of skill.steps) {
    if (!step.actionType) {
      skippedSteps += 1;
      continue;
    }

    await operator.execute({
      prediction: step.title,
      parsedPrediction: {
        action_type: step.actionType,
        action_inputs: normalizeActionInputs(step.actionInputs),
        reflection: step.expectedOutcome || null,
        thought: step.explanation || step.title,
      },
      screenWidth: physicalSize.width,
      screenHeight: physicalSize.height,
      scaleFactor,
      factors: [1000, 1000],
    });

    executedSteps += 1;
    await sleep(250);
  }

  return {
    skillId: skill.id,
    totalSteps: skill.steps.length,
    executedSteps,
    skippedSteps,
  };
};

export const exportTeachSkill = async (
  skillId: string,
): Promise<TeachSkillPortable> => {
  const skill = await getTeachSkill(skillId);
  if (!skill) {
    throw new Error(`Teach skill not found: ${skillId}`);
  }

  const steps: TeachSkillStepInput[] = [];

  for (const step of skill.steps) {
    const assetFilePath = resolveTeachAssetFilePath(
      skill.assetsDir,
      step.assetPath,
    );
    const screenshotBuffer = await fs.readFile(assetFilePath);
    steps.push({
      id: step.id,
      title: step.title,
      explanation: step.explanation,
      expectedOutcome: step.expectedOutcome,
      capturedAt: step.capturedAt,
      screenshotBase64: screenshotBuffer.toString('base64'),
      actionType: step.actionType,
      actionInputs: step.actionInputs,
    });
  }

  return {
    id: skill.id,
    name: skill.name,
    goal: skill.goal,
    plan: skill.plan,
    model: skill.model,
    steps,
  };
};

export const importTeachSkill = async (
  payload: TeachSkillPortable,
): Promise<TeachSkillSummary> => {
  return saveTeachSkill(payload);
};

export const deleteTeachSkill = async (
  skillId: string,
): Promise<TeachSkillDeleteResult> => {
  const safeSkillId = sanitizeSkillId(skillId);
  const skill = await getTeachSkill(safeSkillId);
  if (!skill) {
    return {
      id: safeSkillId,
      deleted: false,
    };
  }

  const teachRootDir = getTeachRootDir();
  const filePath = path.join(teachRootDir, toSkillFileName(safeSkillId));
  let assetsDirPath = '';
  try {
    assetsDirPath = resolveTeachAssetsDirPath(skill.assetsDir);
  } catch (error) {
    logger.warn('[TeachSkills] Refusing to delete invalid assets directory', {
      skillId: safeSkillId,
      recordSkillId: skill.id,
      assetsDir: skill.assetsDir,
      error,
    });
    throw error;
  }

  await fs.rm(filePath, { force: true });
  await fs.rm(assetsDirPath, { recursive: true, force: true });

  return {
    id: safeSkillId,
    deleted: true,
  };
};
