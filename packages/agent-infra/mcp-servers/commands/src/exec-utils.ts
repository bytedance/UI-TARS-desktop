/**
 * The following code is modified based on
 * https://github.com/g0t4/mcp-server-commands/blob/master/src/exec-utils.ts
 *
 * MIT License
 * Copyright (c) 2025 g0t4
 * https://github.com/g0t4/mcp-server-commands/blob/master/LICENSE
 */
import { TextContent } from '@modelcontextprotocol/sdk/types.js';
import { exec, ExecOptions } from 'child_process';
import { ObjectEncodingOptions } from 'fs';

type ExecResult = {
  // FYI leave this type for now as a declaration of the expected shape of the result for BOTH success and failure (errors)
  //   do not switch to using ExecException b/c that only applies to failures
  stdout: string;
  stderr: string;

  // message is the error message from the child process, not sure I like this naming
  // - perhaps worth pushing the error logic out of messagesFor back into catch block above
  message?: string;
};

/**
 * Executes a file with the given arguments, piping input to stdin.
 * @param {string} interpreter - The file to execute.
 * @param {string} stdin_text - The string to pipe to stdin.
 * @returns {Promise<ExecResult>} A promise that resolves with the stdout and stderr of the command. `message` is provided on a failure to explain the error.
 */
function execFileWithInput(
  interpreter: string,
  stdin_text: string,
  options: ObjectEncodingOptions & ExecOptions,
): Promise<ExecResult> {
  // FYI for now, using `exec()` so the interpreter can have cmd+args AIO
  //  could switch to `execFile()` to pass args array separately
  // TODO starts with fish too? "fish -..." PRN use a library to parse the command and determine this?
  if (interpreter.split(' ')[0] === 'fish') {
    // PRN also check error from fish and add possible clarification to error message though there are legit ways to trigger that same error message! i.e. `fish .` which is not the same issue!
    return fishWorkaround(interpreter, stdin_text, options);
  }

  return new Promise((resolve, reject) => {
    const child = exec(interpreter, options, (error, stdout, stderr) => {
      if (error) {
        reject({ message: error.message, stdout, stderr });
      } else {
        resolve({ stdout, stderr });
      }
    });

    if (stdin_text) {
      if (child.stdin === null) {
        reject(new Error('Unexpected failure: child.stdin is null'));
        return;
      }
      child.stdin.write(stdin_text);
      child.stdin.end();
    }
  });
}

async function fishWorkaround(
  interpreter: string,
  script: string,
  options: ObjectEncodingOptions & ExecOptions,
): Promise<ExecResult> {
  // fish right now chokes on piped input (STDIN) + node's exec/spawn/etc, so lets use a workaround to echo the input
  // base64 encode thee input, then decode in pipeline
  const base64Script = Buffer.from(script).toString('base64');

  const command = `${interpreter} -c "echo ${base64Script} | base64 -d | fish"`;

  return new Promise((resolve, reject) => {
    // const child = ... // careful with refactoring not to return that unused child
    exec(command, options, (error, stdout, stderr) => {
      // I like this style of error vs success handling! it's beautiful-est (prommises are underrated)
      if (error) {
        reject({ message: error.message, stdout, stderr });
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

function messagesFor(result: ExecResult): TextContent[] {
  const messages: TextContent[] = [];
  if (result.message) {
    messages.push({
      // most of the time this is gonna match stderr, TODO do I want/need both error and stderr?
      type: 'text',
      text: result.message,
      name: 'ERROR',
    });
  }
  if (result.stdout) {
    messages.push({
      type: 'text',
      text: result.stdout,
      name: 'STDOUT',
    });
  }
  if (result.stderr) {
    messages.push({
      type: 'text',
      text: result.stderr,
      name: 'STDERR',
    });
  }
  return messages;
}

function always_log(message: string, data?: any) {
  if (data) {
    console.error(message + ': ' + JSON.stringify(data));
  } else {
    console.error(message);
  }
}

export { execFileWithInput, ExecResult, messagesFor, always_log };
