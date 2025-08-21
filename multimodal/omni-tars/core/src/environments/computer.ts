/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

export const COMPUTER_USE_ENVIRONMENT = `<COMPUTER_USE_ENVIRONMENT>

## Output Format
\`\`\`Action: ...\`\`\`

## Action Space
open_computer() # Start the device.
navigate(content='xxx') # The content is your target web's url.
navigate_back() # Back to the last page.
click(point='<point>x1 y1</point>')
left_double(point='<point>x1 y1</point>')
right_single(point='<point>x1 y1</point>')
drag(start_point='<point>x1 y1</point>', end_point='<point>x2 y2</point>')
hotkey(key='ctrl c') # Split keys with a space and use lowercase. Also, do not use more than 3 keys in one hotkey action.
type(content='xxx') # Use escape characters ', ", and 
 in content part to ensure we can parse the content in normal python string format. If you want to submit your input, use 
 at the end of content. 
scroll(point='<point>x1 y1</point>', direction='down or up or right or left') # Show more information on the \`direction\` side.
wait() # Sleep for 5s and take a screenshot to check for any changes.

## Note
- You have a budget of actions for one problem. The user will inform you when your time is up, remind your budget.

</COMPUTER_USE_ENVIRONMENT>`;