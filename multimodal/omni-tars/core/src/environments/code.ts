/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

export const HOME_INSTRUCTION = `- execute_bash, str_replace_editor must be executed based on the /home/gem root directory. 
If you think that solving the problem requires creating a complete project, then you should first execute mkdir -p {project_dir} for the project, and all the remaining operations must be under /home/gem/{project_dir}. 
For the specific directory name, please be reasonably named according to the content of the task.`;

export const STOP_INSTRUCTION = `\n
  ## WARNING:
  - After outputting </code_env>, you MUST STOP immediately and wait for the tool result in the next agent loop. DO NOT generate any additional text.
  - When you receive tool results, they will be provided in a user message. Use these results to continue your reasoning or provide a final answer.
  `;

export const PROXY_INSTRUCTION = `- If you start the service on a port, Do not use port in [8080,8079,8081,8088,8091,8100,8101,8102,8888,9222]. After launch the service, navigate it through a web browser`;

export const CODE_ENVIRONMENT = `<CODE_ENVIRONMENT>

---- BEGIN FUNCTION #1: execute_bash ----
Description: Execute a bash command in the terminal.
* Long running commands: For commands that may run indefinitely, it should be run in the background and the output should be redirected to a file, e.g. command = \`python3 app.py > server.log 2>&1 &\`.
* One command at a time: You can only execute one bash command at a time. If you need to run multiple commands sequentially, you can use \`&&\` or \`;\` to chain them together.

Parameters:
  (1) command (string, required): The bash command to execute. Can be empty string to view additional logs when previous exit code is \`-1\`. Can be \`C-c\` (Ctrl+C) to interrupt the currently running process. Note: You can only execute one bash command at a time. If you need to run multiple commands sequentially, you can use \`&&\` or \`;\` to chain them together.
---- END FUNCTION #1 ----

---- BEGIN FUNCTION #2: JupyterCI ----
Description: JupyterCI 一个保留状态的代码沙盒工具。你可以在此工具中运行python代码
Parameters:
  (1) code (string, required): code
  (2) timeout (number, optional): timeout in seconds
---- END FUNCTION #2 ----

---- BEGIN FUNCTION #3: str_replace_editor ----
Description: Custom editing tool for viewing, creating and editing files in plain-text format
* State is persistent across command calls and discussions with the user
* If \`path\` is a file, \`view\` displays the result of applying \`cat -n\`. If \`path\` is a directory, \`view\` lists non-hidden files and directories up to 2 levels deep
* The \`create\` command cannot be used if the specified \`path\` already exists as a file
* If a \`command\` generates a long output, it will be truncated and marked with \`<response clipped>\`
* The \`undo_edit\` command will revert the last edit made to the file at \`path\`

Notes for using the \`str_replace\` command:
* The \`old_str\` parameter should match EXACTLY one or more consecutive lines from the original file. Be mindful of whitespaces!
* If the \`old_str\` parameter is not unique in the file, the replacement will not be performed. Make sure to include enough context in \`old_str\` to make it unique
* The \`new_str\` parameter should contain the edited lines that should replace the \`old_str\`

Parameters:
  (1) command (string, required): The commands to run. Allowed options are: \`view\`, \`create\`, \`str_replace\`, \`insert\`, \`undo_edit\`.
Allowed values: [\`view\`, \`create\`, \`str_replace\`, \`insert\`, \`undo_edit\`]
  (2) path (string, required): Absolute path to file or directory, e.g. \`/workspace/file.py\` or \`/workspace\`.
  (3) file_text (string, optional): Required parameter of \`create\` command, with the content of the file to be created.
  (4) old_str (string, optional): Required parameter of \`str_replace\` command containing the string in \`path\` to replace.
  (5) new_str (string, optional): Optional parameter of \`str_replace\` command containing the new string (if not given, no string will be added). Required parameter of \`insert\` command containing the string to insert.
  (6) insert_line (integer, optional): Required parameter of \`insert\` command. The \`new_str\` will be inserted AFTER the line \`insert_line\` of \`path\`.
  (7) view_range (array, optional): Optional parameter of \`view\` command when \`path\` points to a file. If none is given, the full file is shown. If provided, the file will be shown in the indicated line number range, e.g. [11, 12] will show lines 11 and 12. Indexing at 1 to start. Setting \`[start_line, -1]\` shows all lines from \`start_line\` to the end of the file.
---- END FUNCTION #3 ----

## Note
- If you choose to call a function ONLY reply in the following format with NO suffix:

<function=example_function_name>
<parameter=example_parameter_1>value_1</parameter>
<parameter=example_parameter_2>
This is the value for the second parameter
that can span
multiple lines
</parameter>
</function>

- Function calls MUST follow the specified format, start with <function= and end with </function>
- Required parameters MUST be specified
- Only call one function at a time
${HOME_INSTRUCTION}
${STOP_INSTRUCTION}
${PROXY_INSTRUCTION}
</CODE_ENVIRONMENT>`;
