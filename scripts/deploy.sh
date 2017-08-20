#!/bin/bash

# Unofficial strict mode -- http://redsymbol.net/articles/unofficial-bash-strict-mode/
set -euo pipefail
IFS=$'\n\t'

git clone git@github.com:hacklily/hacklily.github.io.git ./release
cd release && rm -fr *
cp -fr ../build/* .
echo "www.hacklily.org" > CNAME
git add .
git commit -m "Automatic deployment" --author="deploy.sh <hacklily-deploy-sh@example.com>"
git push
