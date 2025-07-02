#!/usr/bin/env bash

script_path=$(realpath "$0")
script_dir=$(dirname "$(realpath "$0")")
project_dir=$(dirname "$script_dir")
rm -rf $project_dir/dxt
pnpm --filter=@agent-infra/mcp-server-browser --prod deploy $project_dir/dxt
cp -r $project_dir/assets $project_dir/dxt/assets
cp $project_dir/manifest.json $project_dir/dxt/manifest.json

cd $project_dir/dxt
chmod +x $project_dir/dxt/dist/*.{js,cjs}
dxt pack
