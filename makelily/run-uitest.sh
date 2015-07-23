#!/bin/bash
set -e
# Aggressively kill everything when this script exits.
trap "trap - SIGTERM && kill -- -$$" SIGINT SIGTERM EXIT
export npm_config_disturl=https://atom.io/download/atom-shell
export npm_config_target=0.29.1
export npm_config_arch=x64
HOME=~/.electron-gyp npm run prestart
cd ./uitest
../node_modules/.bin/ntsc
npm run hot-dev-server &
sleep 3 # Otherwise, we'd have to reload.
npm run start-hot
