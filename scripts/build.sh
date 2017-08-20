#!/usr/bin/env bash

##################################################
# STEP 1 -- First, build public/react-app.rcc.gz #
##################################################

# public/react-app.rcc.gz -- a version of the app as a Qt Resource file
#                            that will be served by our static deployment and will be
#                            downloaded by the standalone desktop app
#                            NOTE: this file is in .gitignore so we don't track it!

set -euf -o pipefail

if [ -z "${REACT_APP_GITHUB_CLIENT_ID+x}" ]; then
    echo "ERROR: The REACT_APP_GITHUB_CLIENT_ID environment variable is not set." >&2
    exit 1
fi;

if [ -z "${REACT_APP_BACKEND_WS_URL+x}" ]; then
    echo "ERROR: The REACT_APP_BACKEND_WS_URL environment variable is not set." >&2
    exit 1
fi;

DIR_SCRIPTS=$(cd -P -- "$(dirname -- "$0")" && pwd -P) # https://stackoverflow.com/a/17744637
DIR_ROOT="${DIR_SCRIPTS}/.."
DIR_BUILD="${DIR_ROOT}/build"
RCC_NAME="react-app.rcc" # Without the .gz suffix
RCC_PATH="${DIR_ROOT}/public/${RCC_NAME}"

function remove_garbage {
    for path in "$RCC_PATH" "$RCC_PATH.gz" "$RCC_PATH.sha"
    do
        if [ -e $path ]; then
            rm $path
        fi
    done
}
trap remove_garbage EXIT
remove_garbage

echo
echo "[scripts/build.sh: 1/2] Creating '$RCC_PATH.gz' for standalone..."
echo

# Build react app with relative URLs for Qt's resource system
cd $DIR_ROOT
env REACT_APP_STANDALONE=yes PUBLIC_URL="qrc:/react-app" yarn build-react-app

# Create manifold (qrc)
cd $DIR_BUILD
find . -type f |
    jq -Rrs '
        "<RCC>\n" +
        "  <qresource prefix=\"/react-app\">\n" +
        (
            [
                split("\n")[] |
                    select(. != "") |
                        "    <file>" + . + "</file>"
            ] | join("\n")
        ) +
        "\n" +
        "  </qresource>\n" +
        "</RCC>\n"' > react-app.qrc

# Build and compress the rcc
rcc -binary ./react-app.qrc -o $RCC_PATH
gzip $RCC_PATH # yields ${RCC_PATH}.gz
pushd "${DIR_ROOT}/public"
shasum -a 256 $RCC_NAME.gz > $RCC_PATH.sha
popd

echo "Created ${RCC_PATH}.gz"

##################################################################################################
# STEP 2 -- Rebuild the app with the correct ('homepage' in package.json or $PUBLIC_URL) prefix. #
##################################################################################################

echo
echo "[scripts/build.sh: 2/2] Creating $DIR_BUILD..."
echo

cd $DIR_ROOT
yarn build-react-app

# Patch vscode to satisfy librejs
cat ./src/monacoConfig/LICENSE_HEADER.txt > ./build/vs/loader.js.tmp
cat ./build/vs/loader.js >> ./build/vs/loader.js.tmp
mv build/vs/loader.js.tmp ./build/vs/loader.js

cat ./src/monacoConfig/LICENSE_HEADER.txt > ./build/vs/editor/editor.main.js.tmp
cat ./build/vs/editor/editor.main.js >> ./build/vs/editor/editor.main.js.tmp
mv ./build/vs/editor/editor.main.js.tmp ./build/vs/editor/editor.main.js