#!/bin/bash
set -e
# Aggressively kill everything when this script exits.
trap "trap - SIGTERM && kill -- -$$" SIGINT SIGTERM EXIT
sleep 3 # Otherwise, we'd have to reload.
npm run start-hot
