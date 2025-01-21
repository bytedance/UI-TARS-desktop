/**
 * Copyright (c) 2024-present Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: MIT
 */
import { strict as assert } from 'node:assert';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { reportHTMLWithDump } from './build-html';
import { ensureDirectoryExistence, fileContentOfPath } from './building-utils';

const devMockJSON = fileContentOfPath('./fixture/mock.json');

const outputReportHTML = join(__dirname, '../dist/mock/index.html');

/* build task: report and demo pages*/
function buildReport() {
  const reportHTMLContent = reportHTMLWithDump();
  assert(reportHTMLContent.length >= 1000);
  ensureDirectoryExistence(outputReportHTML);
  writeFileSync(outputReportHTML, reportHTMLContent);
  console.log(
    `HTML file generated successfully: ${outputReportHTML}, size: ${reportHTMLContent.length}`,
  );

  // dump data with mock array
  reportHTMLWithDump(devMockJSON, '', outputReportHTML);
}

buildReport();
