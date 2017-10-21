#!/bin/bash
cd "$(dirname ${BASH_SOURCE[0]})/..";
set -e
cd ./src;
find . -type f -name "*.css" -exec install -m 644 "{}" ../dist/webapp/src/{} ";"
