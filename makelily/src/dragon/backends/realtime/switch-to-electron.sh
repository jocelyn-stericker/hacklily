#!/bin/sh
export npm_config_disturl=https://atom.io/download/atom-shell
export npm_config_target=0.29.1
export npm_config_arch=x64
rm -rf ./build
HOME=~/.electron-gyp npm install
