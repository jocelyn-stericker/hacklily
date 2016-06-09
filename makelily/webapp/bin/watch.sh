#!/bin/bash
cd "$(dirname ${BASH_SOURCE[0]})/..";
set -e
trap 'trap - TERM; kill 0' INT TERM EXIT;
CLEAN="1"; 
INIT="0"; 
WARN_COLOR="\033[33;01m";
INFO_COLOR="\033[36;01m";
NO_COLOR="\033[0m";
ERROR_COLOR="\033[31;01m";
../node_modules/.bin/tsc -w | while read line; do 
    if [[ $line == *Compilation\ complete.\ Watching\ for\ file\ changes* ]]; then 
        if [[ "$CLEAN" == "1" ]]; then 
            printf "satie/webapp${INFO_COLOR}: $line${NO_COLOR}\n"; 
            cd ./dist; 
            find . -type f -name "*.js" -exec touch "{}" ";" ; 
            cd ..; 
            if [[ "$INIT" == "0" ]]; then 
            ../node_modules/.bin/nodemon -I -e css --exec "bash ./bin/update_css.sh" -w ./src/ -d 1 &
            if [[ "x$RUN_LINT" != "x" ]]; then 
                ../node_modules/.bin/nodemon -I -e js,ts,css --exec "make lint || true" -w ./dist/ -d 2 &
            else 
                printf "satie/webapp${WARN_COLOR}: Linting is disabled. Run 'env RUN_LINT=1 make watch' to run tests. ${NO_COLOR}\n"; 
            fi; 
            if [[ "x$RUN_TEST" != "x" ]]; then 
                ../node_modules/.bin/nodemon -I -e js,ts,css --exec "make _testOnly || true" -w ./dist/ -d 2 &
            else 
                printf "satie/webapp${WARN_COLOR}: Testing is disabled. Run 'env RUN_TEST=1 make watch' to run tests. ${NO_COLOR}\n"; 
            fi; 
            if [[ "x$RUN_DEVSRV" != "x" ]]; then 
                ./bin/run_devsrv.sh &
            else 
                printf "satie/webapp${WARN_COLOR}: The dev server is disabled. Run 'env RUN_DEVSRV=1 make watch' to enable. ${NO_COLOR}\n"; 
            fi; 
            INIT="1"; 
            fi; 
        else 
            printf "satie/webapp${ERROR_COLOR}: $line${NO_COLOR}\n"; 
        fi; 
    elif [[ $line == *File\ change\ detected.\ Starting\ incremental\ compilation* ]]; then 
        echo ""; 
        echo ""; 
        echo ""; 
        echo ""; 
        CLEAN="1"; 
        printf "satie/webapp${INFO_COLOR}: $line${NO_COLOR}\n"; 
    else 
        CLEAN="0"; 
        printf "satie/webapp${ERROR_COLOR}: $line${NO_COLOR}\n"; 
    fi; 
done;
