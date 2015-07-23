Audio and MIDI I/O for Node.js written in D.

# Setup

## System Dependencies

### Mac
```
brew install dmd dub fluid-synth lame libogg libsndfile libvorbis mpg123 node portaudio portmidi python

npm install
```

To switch to the Electron version:
```
./switch-to-electron.sh
```

To switch back to the CLI version
```
rm -rf ./build
npm install
```

## Building and Running
To run the CLI version:
```
npm start
```

To run the Electron version:
```
./run-uitest.sh
```
