# TODOs

- Every time Claude runs a python script, `python` is used as the interpreter. Which fails every time.
    - Thankfully, Claude retries with `python3` and uses that for the rest of the chat. 
        - Hence the idea to have some memory concept across chats! Very selective memory and very minimal.
        - I was thinking of adding a tool for this server alone, one to write to and another to read from this cmdline memory... and then otherwise instruct Claude to judiciously use the memory (i.e. never if possible)
        - And, don't put any constraints on the memory other than a list of strings. Claude can do all that on his own (i.e. a line with `pythoh3` alone should be sufficient, in fact I could do some testing with that alone and see how Claude does)
    - Another example would be `uname` on a Windows machine. 
    - These different scenarios aren't necessarily mission critical to fix but they offer an opportunity to improve the experience.
    - The solution may not be generalizable too and might be specific to command that fails, i.e. if I pass the OS name in the ListTools response, that will likely fix that issue.
    - i.e. routinely `python` is used and then `python3`
    - Or, should I have some static mappings of common commands that fail and when they do, use the fallback? And find a way to tell the LLM? Or,
    - Or would some sort of command lookup mechanism be useful? i.e. python3 instead of python
- Add windows tests, linux tests and macOS tests for nuances of each. i.e. pwsh, pwsh-core, cmd.exe on Windows.
- Add a server side request to score risk of a tool request (specific to run_command/run_script?) - this wouldn't be a tool the LLM uses, but rather the client.
    - Claude makes tool request, client passes it to server for scoring, server returns risk, client decides to prompt (or not) and then client sends tool request to server...
    - Or, have client use another LLM score it?
    - I chimed in about this on this discussion: https://github.com/orgs/modelcontextprotocol/discussions/69 
    - Also, some tools might be able to be marked safe in their spec, i.e. getting date/time, fetching a web page... inherently mostly "safe"
    - The fewer prompts the user sees, the most likely that the user will actually read the requested tool use. Otherwise, next next next prompt fatigue kicks in regardless of risk
