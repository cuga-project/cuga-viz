#!/bin/sh
set -eu

cd "$(dirname "$0")/.."
pnpm run build
rm -rf server/dashboard/static
cp -R dist server/dashboard/static
cd server
uv pip install -e .
