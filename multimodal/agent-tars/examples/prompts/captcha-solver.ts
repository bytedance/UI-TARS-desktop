/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { runAgentTARS } from '../default';

runAgentTARS(`
Please help me automate a web task that involves solving a CAPTCHA and extracting information from a website. Follow these steps:

1. Navigate https://beian.miit.gov.cn/#/Integrated/recordQuery
2. In the search field (selector: ".Search_lebet .el-input input"), type "iqiyi.com"
3. Click the search button (selector: ".Search_lebet .el-button")
4. When the CAPTCHA appears, you need to:
   - Identify the 4 Chinese characters you need to click
   - Find their positions on the screen
   - Click on them in the correct sequence
5. After successfully solving the CAPTCHA, extract the company name and registration number from the results table (in the .el-table__row)
6. Display the extracted information

Note: You may need to handle multiple CAPTCHA attempts if the first one fails. Also, you should hide unnecessary elements like headers and footers to focus on the main content.
`);
