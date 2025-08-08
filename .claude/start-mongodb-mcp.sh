#!/bin/bash

PORT=3191  # or pick any unused port

echo "✅ Launching MongoDB MCP on port $PORT"

node --input-type=module <<EOF
import { spawn } from 'child_process';

const proc = spawn('npx', [
  '-y',
  'mongodb-mcp-server',
  '--connectionString',
  'mongodb://localhost:27017/pos',
  '--readOnly',
  '--port',
  '$PORT'
], {
  stdio: ['ignore', 'pipe', 'inherit'],
  env: process.env
});

proc.stdout.on('data', (data) => {
  const str = data.toString();
  if (str.includes('listening')) {
    console.log("MCP server listening on http://localhost:$PORT");
  }
  process.stdout.write(str);
});
EOF
