/*
 * Copyright (C) 2025 Bytedance Ltd. and/or its affiliates
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { ComputerUseUserData } from '@ui-tars/desktop-shared/types/data';

function replaceStringWithFirstAppearance(
  str: string,
  target: string,
  replacement: string,
) {
  const index = str.indexOf(target);
  return str.slice(0, index) + replacement + str.slice(index + target.length);
}

export function reportHTMLContent(
  tpl: string,
  dumpData: ComputerUseUserData[],
): string {
  let reportContent = '';
  console.log('dumpData', Array.isArray(dumpData));
  if (
    (Array.isArray(dumpData) && dumpData.length === 0) ||
    typeof dumpData === 'undefined'
  ) {
    reportContent = replaceStringWithFirstAppearance(
      tpl,
      '{{dump}}',
      `<script type="ui_tars_web_dump" type="application/json"></script>`,
    );
  } else if (typeof dumpData === 'string') {
    reportContent = replaceStringWithFirstAppearance(
      tpl,
      '{{dump}}',
      `<script type="ui_tars_web_dump" type="application/json">${dumpData}</script>`,
    );
  } else {
    const dumps = dumpData.map((data) => {
      return `<script type="ui_tars_web_dump" type="application/json">${JSON.stringify(data)}\n</script>`;
    });
    reportContent = replaceStringWithFirstAppearance(
      tpl,
      '{{dump}}',
      dumps.join('\n'),
    );
  }

  return reportContent;
}
