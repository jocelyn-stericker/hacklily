# Dragon: Declarative Audio and MIDI

Dragon adds musical superpowers to your React application. This JavaScript library has components for applications with Audio or MIDI I/O. You can use it right now to build native applications on Windows, Mac, and Linux using [Electron](http://electron.atom.io). An HTML5 engine is also coming.

## A digital piano

Here's an application that converts key presses on all MIDI devices into piano sounds:

```javascript
import React from 'react';

import DragonRT from 'dragon-realtime';
import {DragonApp, PhysicalAudioOut, Synth, PhysicalMIDIIn} from 'dragon-framework';

export default class React.Component {
  render() {
    return <DragonApp engine={DragonRT} onMessage={this.handleMsg.bind(this}
        onStateChanged={engineState => this.setState({engineState})>
      <PhysicalOutput all audio>
        <Synth program="Acoustic Grand Piano">
          <PhysicalInput all midi/>
        </Synth>
      </PhysicalOutput>
    </DragonApp>;
  }
}
```

Notice that MIDI and audio travel from the leaf nodes (above, `<PhysicalMIDIIn />`) up the tree, just like events in the DOM.

## Getting starting

First, set up a React + Electron application. [Electron React Boilerplate](https://github.com/airtoxin/Electron-React-Boilerplate) is a good starting point.

Then, add Dragon and the realtime (i.e., native) Dragon backend:

```bash
npm install --save ripieno/dragon ripieno/dragon-realtime
```

Next, copy the above component somewhere, and mount it.

## Components

### `<DragonApp>`

This is the top-level component. All Dragon applications need one. This can live anywhere in your application's hierarchy and does not need to be directly above other Dragon components. You can have both Dragon and DOM components interleaved.

 - `engine={...}` (**Required**) specifies the Dragon backend. You can use `dragon-realtime` for native applications in Electron, or `dragon-framework/dummy-engine` for testing. You can look at the `dummy-engine` source for help in building your own engine. If you do, please add it here with a pull request!
 - `onStateChanged={...}` the function passed-in is called with a structure explaining the Audio and MIDI capabilities of the system, any errors that have occured, and whether the Audio and MIDI subsystems are uninitialized, initialized (but not streaming), or streaming. See the `EngineState` structure in `Interfaces` below.

```
TODO
```

## Why the name?

- Dragons are really cool.
- The realtime backend is written in the D programming language.
- Applications that use Dragon are Dragon Audio Workstations (DAW).
