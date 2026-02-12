#!/usr/bin/env node

const fs = require('node:fs/promises');
const path = require('node:path');

const [, , skillFileArg] = process.argv;

const fail = (message) => {
  throw new Error(message);
};

const assertString = (value, field) => {
  if (typeof value !== 'string' || !value.trim()) {
    fail(`Field "${field}" must be a non-empty string`);
  }
};

const assertIsoDate = (value, field) => {
  assertString(value, field);
  if (Number.isNaN(Date.parse(value))) {
    fail(`Field "${field}" must be an ISO date string`);
  }
};

const validateSkillSchema = async (absoluteFilePath, raw) => {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    fail('Skill file must be a JSON object');
  }

  if (raw.version !== 1) {
    fail('Field "version" must equal 1');
  }

  assertString(raw.id, 'id');
  assertString(raw.name, 'name');
  assertString(raw.goal, 'goal');
  assertString(raw.model, 'model');
  assertString(raw.assetsDir, 'assetsDir');
  assertIsoDate(raw.createdAt, 'createdAt');
  assertIsoDate(raw.updatedAt, 'updatedAt');

  if (!Array.isArray(raw.steps) || raw.steps.length === 0) {
    fail('Field "steps" must be a non-empty array');
  }

  const parentDir = path.dirname(absoluteFilePath);
  if (path.isAbsolute(raw.assetsDir)) {
    fail('Field "assetsDir" must be relative');
  }

  const declaredAssetsDirPath = path.resolve(parentDir, raw.assetsDir);
  const relativeAssetsDirPath = path.relative(parentDir, declaredAssetsDirPath);
  if (
    !relativeAssetsDirPath ||
    relativeAssetsDirPath.startsWith('..') ||
    path.isAbsolute(relativeAssetsDirPath)
  ) {
    fail('Field "assetsDir" must stay within skill directory');
  }

  for (let i = 0; i < raw.steps.length; i += 1) {
    const step = raw.steps[i];
    const prefix = `steps[${i}]`;

    if (typeof step !== 'object' || step === null || Array.isArray(step)) {
      fail(`Field "${prefix}" must be an object`);
    }

    assertString(step.id, `${prefix}.id`);
    assertString(step.title, `${prefix}.title`);
    assertIsoDate(step.capturedAt, `${prefix}.capturedAt`);
    assertString(step.assetPath, `${prefix}.assetPath`);

    if (step.explanation != null && typeof step.explanation !== 'string') {
      fail(`Field "${prefix}.explanation" must be string if present`);
    }
    if (step.expectedOutcome != null && typeof step.expectedOutcome !== 'string') {
      fail(`Field "${prefix}.expectedOutcome" must be string if present`);
    }
    if (step.actionType != null && typeof step.actionType !== 'string') {
      fail(`Field "${prefix}.actionType" must be string if present`);
    }
    if (
      step.actionInputs != null &&
      (typeof step.actionInputs !== 'object' || Array.isArray(step.actionInputs))
    ) {
      fail(`Field "${prefix}.actionInputs" must be object if present`);
    }

    if (path.isAbsolute(step.assetPath)) {
      fail(`Field "${prefix}.assetPath" must be relative`);
    }

    const assetFilePath = path.resolve(parentDir, step.assetPath);
    const relativeAssetPath = path.relative(parentDir, assetFilePath);
    if (
      !relativeAssetPath ||
      relativeAssetPath.startsWith('..') ||
      path.isAbsolute(relativeAssetPath)
    ) {
      fail(`Field "${prefix}.assetPath" must stay within skill directory`);
    }

    const relativeToDeclaredAssetsDir = path.relative(
      declaredAssetsDirPath,
      assetFilePath,
    );
    if (
      !relativeToDeclaredAssetsDir ||
      relativeToDeclaredAssetsDir.startsWith('..') ||
      path.isAbsolute(relativeToDeclaredAssetsDir)
    ) {
      fail(`Field "${prefix}.assetPath" must stay within assetsDir`);
    }

    try {
      const stat = await fs.stat(assetFilePath);
      if (!stat.isFile()) {
        fail(`Asset path is not a file: ${step.assetPath}`);
      }
    } catch {
      fail(`Asset file does not exist: ${step.assetPath}`);
    }
  }
};

const main = async () => {
  if (!skillFileArg) {
    console.error(
      'Usage: node scripts/validate-skill-file.js <path-to-skill-file.json>',
    );
    process.exitCode = 1;
    return;
  }

  const absoluteFilePath = path.resolve(process.cwd(), skillFileArg);
  const content = await fs.readFile(absoluteFilePath, 'utf-8');
  const parsed = JSON.parse(content);

  await validateSkillSchema(absoluteFilePath, parsed);

  console.log(
    `[validate-skill-file] OK. ${path.relative(process.cwd(), absoluteFilePath)} has ${parsed.steps.length} step(s).`,
  );
};

main().catch((error) => {
  console.error('[validate-skill-file] Failed:', error.message);
  process.exitCode = 1;
});
