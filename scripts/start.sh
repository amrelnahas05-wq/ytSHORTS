#!/bin/bash
set -e

echo "Pushing database schema..."
pnpm --filter @workspace/db run push

echo "Starting API server..."
node artifacts/api-server/dist/index.mjs
