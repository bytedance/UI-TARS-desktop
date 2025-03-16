/**
 * The following code is modified based on
 * https://github.com/g0t4/mcp-server-commands/blob/master/tests/manual/exec-file-sync.cjs
 *
 * MIT License
 * Copyright (c) 2025 g0t4
 * https://github.com/g0t4/mcp-server-commands/blob/master/LICENSE
 */
const { execFile, execFileSync } = require('child_process');

// FYI async too but not the point of this script
execFile('ls', ['-l'], (error, stdout, stderr) => {
  if (error) console.error(`Error: ${error.message}`);
  else console.log(`Stdout: ${stdout}`);
});

execFile('ls', ['-l'], { input: 'echo foobar2' }, (error, stdout, stderr) => {
  if (error) console.error(`Error: ${error.message}`);
  else console.log(`Stdout: ${stdout}`);
});

// !!! key demo here of execFileSync
const inbash = execFileSync('bash', [], { input: 'echo foobar' });
console.log(inbash.toString()); // sync means it will show before async callbacks
const infish = execFileSync('fish', [], { input: 'echo foobar' });
// FYI did some testing of fish shell:
//   new rust version doesn't fail on this, so this is definitely a bug in c++ builds only
//   - reproduced with remote:  origin/Integration_3.7.1
//     make
//     set PATH /Users/wes/repos/github/fish-shell/fish-shell/build  $PATH
//     node exec-file-sync.cjs # this script
//     FYI traced back to this line: https://github.com/fish-shell/fish-shell/blob/tmp3.7.1/src/reader.cpp#L4763
//
//   rust build works:
//     gcob master
//     cargo build
//     set PATH /Users/wes/repos/github/fish-shell/fish-shell/target/debug/ $PATH
//     node exec-file-sync.cjs # this script
//     # works fine! perhaps I should start running the rust build :) and give feedback on bugs anyways?
//
// show buffer text:
console.log(infish.toString()); // sync means it will show before async callbacks
