#!/usr/bin/env bash

set -euf -o pipefail

echo "Checking that code is formatted..."
if ! ./node_modules/.bin/prettier -l './src/**{ts,tsx,js,jsx}'; then
    echo "The files above are not formatted. Run 'make fmt' or install prettier integration in your editor"
    exit 1
fi

DIR_SCRIPTS=$(cd -P -- "$(dirname -- "$0")" && pwd -P) # https://stackoverflow.com/a/17744637
DIR_ROOT="${DIR_SCRIPTS}/.."
cd $DIR_ROOT
yarn build-react-app

# TODO: get librejs to accept vscode
