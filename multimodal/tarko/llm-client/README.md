# @tarko/llm-client

A TypeScript SDK to call multiple LLM Providers in OpenAI format.

## OpenAI proxy configuration

The `openai` and `openai-non-streaming` providers honor `HTTP_PROXY`,
`HTTPS_PROXY`, `ALL_PROXY`, and `NO_PROXY` (including lowercase variants) in
Node.js. For an OpenAI endpoint reached through an HTTP proxy, set
`HTTPS_PROXY=http://127.0.0.1:4780` before starting Agent TARS. Keep `baseURL`
pointed at the API endpoint; the proxy URL is not an API base URL.

## Credits

This package is forked from [token.js](https://github.com/token-js/token.js), For multimodal and Azure OpenAI support, we had to fork, thanks to [RPate97](https://github.com/RPate97) for his work.
