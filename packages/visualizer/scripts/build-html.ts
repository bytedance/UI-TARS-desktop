/**
 * Copyright (c) 2024-present Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: MIT
 */
import { strict as assert } from 'node:assert';
import CleanCSS from 'clean-css';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { execa } from 'execa';

import {
  ensureDirectoryExistence,
  fileContentOfPath,
  safeCopyFile,
} from './building-utils';

const reportTpl = fileContentOfPath('../html/report.html');
const reportCSS = fileContentOfPath('../dist/report.css');
const reportJS = fileContentOfPath('../dist/report.js');

const outputReportHTML = join(__dirname, '../dist/report/index.html');
const outputMultiEntriesHTML = join(__dirname, '../dist/report/multi.html');
const outputEmptyDumpHTML = join(__dirname, '../dist/report/empty-error.html');

const replaceStringWithFirstAppearance = (
  str: string,
  target: string,
  replacement: string,
) => {
  const index = str.indexOf(target);
  return str.slice(0, index) + replacement + str.slice(index + target.length);
};

/* report utils */
function emptyDumpReportHTML() {
  const cleanCSS = new CleanCSS();
  const minifiedCSS = cleanCSS.minify(reportCSS).styles;

  let html = replaceStringWithFirstAppearance(
    reportTpl,
    '{{css}}',
    `<style>\n${minifiedCSS}\n</style>\n`,
  );

  html = replaceStringWithFirstAppearance(
    html,
    '{{js}}',
    `<script>\n${reportJS}\n</script>`,
  );

  return html;
}

export function reportHTMLWithDump(
  dumpJsonString?: string,
  rawDumpString?: string,
  filePath?: string,
) {
  let dumpContent = rawDumpString;
  if (!dumpContent && dumpJsonString) {
    dumpContent = `<script type="ui_tars_web_dump">\n${dumpJsonString}\n</script>`;
  }

  const reportHTML = replaceStringWithFirstAppearance(
    emptyDumpReportHTML(),
    '{{dump}}',
    dumpContent || '{{dump}}',
  );

  if (filePath) {
    writeFileSync(filePath, reportHTML);
    console.log(`HTML file generated successfully: ${filePath}`);
  }
  return reportHTML;
}

async function zipDir(src: string, dest: string) {
  // console.log('cwd', dirname(src));
  await execa('zip', ['-r', dest, '.'], { cwd: src });
}

/* build task: report and demo pages*/
async function buildReport() {
  const reportHTMLContent = reportHTMLWithDump();
  assert(reportHTMLContent.length >= 1000);
  ensureDirectoryExistence(outputReportHTML);
  writeFileSync(outputReportHTML, reportHTMLContent);
  console.log(
    `HTML file generated successfully: ${outputReportHTML}, size: ${reportHTMLContent.length}`,
  );

  // dump data with empty array
  reportHTMLWithDump(
    undefined,
    '<script type="ui_tars_web_dump"></script>',
    outputEmptyDumpHTML,
  );

  // copy to resources
  // safeCopyFile(
  //   outputReportHTML,
  //   join(__dirname, '../../../resources/report.html'),
  // );
}

buildReport();
