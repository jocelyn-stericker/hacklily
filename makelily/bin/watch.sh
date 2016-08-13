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
./node_modules/.bin/tsc -w | while read line; do 
    if [[ $line == *Compilation\ complete.\ Watching\ for\ file\ changes* ]]; then 
        if [[ "$CLEAN" == "1" ]]; then 
            printf "satie/lib${INFO_COLOR}: $line${NO_COLOR}\n"; 
            cd ./dist; 
            find . -type f -name "*.js" -exec touch "{}" ";" ; 
            cd ..; 
		    (make _watchStage) &
            if [[ "$INIT" == "0" ]]; then 
            if [[ "x$RUN_LINT" != "x" ]]; then 
                ../node_modules/.bin/nodemon -I -e js,ts --exec "make lint || true" -w ./dist/ -d 2 &
            else 
                printf "satie/lib${WARN_COLOR}: Linting is disabled. Run 'env RUN_LINT=1 make watch' to run tests. ${NO_COLOR}\n"; 
            fi; 
            if [[ "x$RUN_TEST" != "x" ]]; then 
                ../node_modules/.bin/nodemon -I -e js,ts --exec "make _testOnly || true" -w ./dist/ -d 2 &
            else 
                printf "satie/lib${WARN_COLOR}: Testing is disabled. Run 'env RUN_TEST=1 make watch' to run tests. ${NO_COLOR}\n"; 
            fi; 
			if [[ "x$RUN_SATIEAPP" != "x" ]]; then
			    sleep 5;
			    cd ./webapp;
			    make watch RUN_DEVSRV=1 &
			    cd ..;
			else \
			    printf "$(WARN_COLOR)» The Satie app is disabled. Run 'make watch RUN_SATIEAPP=1' to run the test server. $(NO_COLOR)\n";
			fi; \
            if [[ "x$RUN_DEVSRV" != "x" ]]; then 
                ./bin/run_devsrv.sh &
            else 
                printf "satie/lib${WARN_COLOR}: The dev server is disabled. Run 'env RUN_DEVSRV=1 make watch' to enable. ${NO_COLOR}\n"; 
            fi; 
            INIT="1"; 
            fi; 
        else 
            printf "satie/lib${ERROR_COLOR}: $line${NO_COLOR}\n"; 
        fi; 
    elif [[ $line == *File\ change\ detected.\ Starting\ incremental\ compilation* ]]; then 
        echo ""; 
        echo ""; 
        echo ""; 
        echo ""; 
        CLEAN="1"; 
        printf "satie/lib${INFO_COLOR}: %s${NO_COLOR}\n" "$line"; 
    else 
        CLEAN="0"; 
        printf "satie/lib${ERROR_COLOR}: %s${NO_COLOR}\n" "$line"; 
    fi; 
done;
