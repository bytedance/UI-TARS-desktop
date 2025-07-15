# Troubleshooting

## Install

### error ENOTEMPTY: directory not empty

当你运行 `npm install @agent-tars/cli@latest -g` 进行全局安装，你可能会遇到如下报错：

```bash
npm error code ENOTEMPTY
npm error syscall rename
npm error path /Users/x/.nvm/versions/node/v22.15.0/lib/node_modules/@agent-tars/cli
npm error dest /Users/x/.nvm/versions/node/v22.15.0/lib/node_modules/@agent-tars/.cli-spATNqH2
npm error errno -66
npm error ENOTEMPTY: directory not empty, rename '/Users/x/.nvm/versions/node/v22.15.0/lib/node_modules/@agent-tars/cli' -> '/Users/x/.nvm/versions/node/v22.15.0/lib/node_modules/@agent-tars/.cli-spATNqH2'
npm error A complete log of this run can be found in: /Users/x/.npm/_logs/2025-06-19T06_56_16_371Z-debug-0.log
```

请删除旧版本的目录：

```
rm -rf /Users/x/.nvm/versions/node/v22.15.0/lib/node_modules/@agent-tars/cli
```

然后重新安装。
