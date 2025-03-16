## run_command

command: echo foos

command: ls

command: doesntmatter # should fail

## run_script

interpreter: echo foos
script: doesntmatter

interpreter: bash
script: echo foos

interpreter: python3
script: print(1+1)
