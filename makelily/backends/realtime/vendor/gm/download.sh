#!/bin/sh
test -e ./fluid-soundfont.tar.gz || wget http://www.musescore.org/download/fluid-soundfont.tar.gz
tar -xf ./fluid-soundfont.tar.gz
mv ./FluidR3\ GM2-2.SF2 ./gm.sf2
