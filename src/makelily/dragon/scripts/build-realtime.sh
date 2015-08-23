#!/bin/bash
set -e
export npm_config_disturl=https://atom.io/download/atom-shell
export npm_config_target=0.29.1
export npm_config_arch=x64
cd ./backends/realtime
test -e ./build || node-gyp configure
HOME=~/.electron-gyp npm run prestart
