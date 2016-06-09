#!/bin/bash
cd "$(dirname ${BASH_SOURCE[0]})/..";
set -e
trap 'trap - TERM; kill 0' INT TERM EXIT;
./node_modules/.bin/webpack-dev-server \
    --devtool source-map \
    --output-pathinfo \
    --hot \
    --no-info \
    --progress \
    --history-api-fallback \
    --content-base static \
    --watch \
    ./dist/index.js \
    --host 0.0.0.0 \
    --port 8009 
