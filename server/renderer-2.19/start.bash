#!/bin/bash
chown r /dev/stdin
su r -c "source ~/.profile; render-impl.bash"
