Satie [![Test status][test_status]][test_link]
==============================================

Render and edit sheet music in your browser or Node application.

# Features

 - [MusicXML!][musicxml] Satie natively supports MusicXML for viewing and editing songs.
 - Satie renders sheet music to [SVG][svg]. SVGs can be embedded in a web page or exported. SVGs can be converted to other image formats.
 - Patch-based editing. Updates are fast enough for most real-time editing.

# Quickstart

The easiest way to install Satie is via npm (to get npm, [install Node.js](http://nodejs.org/download/)).

Add `satie` and React to your project via npm:

```
npm install satie react;
```

If you want to view songs inside your web browser, you also need React DOM:

```
npm install react-dom
```

# Rendering songs

## Into a web page

For this part of the guide you need:

 - basic knowledge of React. See React's [getting started guide](https://facebook.github.io/react/docs/getting-started.html).
 - a working development server with React.
 - a MusicXML string you wish to render

Inside your application, this is how you render a song to an element with the ID "root":

```
var SatieApplication = require("satie");
var ReactDOM = require("react-dom");

let satieApp = new SatieApplication();

let song = new satieApp.Song({
    musicXML: sourceOfMusicXML

    errorHandler: function(err) {
        // This is called when the song has a non-recoverable error (e.g., a song could not be opened).
        console.error(err);
    },
});

Song.addChangeListener(function() {
    ReactDOM.render(song.render(), document.getElementById("root"));
});
```

## As an SVG

For this part of the guide you need:

 - basic knowledge of React. See React's [getting started guide](https://facebook.github.io/react/docs/getting-started.html).
 - a MusicXML string you wish to export to an SVG.

Inside your application, this is how you render a song to an element with the ID root:

```
var SatieApplication = require("satie");

let satieApp = new SatieApplication();

let song = new satieApp.Song({
    musicXML: sourceOfMusicXML

    errorHandler: function(err) {
        // This is called when the song has a non-recoverable error (e.g., a song could not be opened).
        console.error(err);
    },
});

Song.addChangeListener(function() {
    console.log(song.toSVG());
});
```

## Developing Satie

### Obtaining

To obtain Satie run,

```
git clone git@github.com:jnetterf/satie.git
cd satie
```

### Development environment

Mac OS X with node and a recent XCode should just work.

Linux-specific instructions: you need some common development tools. (`sudo apt-get install build-essential xsltproc`)

Windows-specific instructions: you need git bash or similar, make, and libxslt2 installed.

### Building

To build, lint, and run unit tests:

| Task                                                | Command               |
|-----------------------------------------------------|-----------------------|
| Build and run unit tests                            | `make`                |
| Build and unit test whenever a file changes         | `make watch`          |
| Build and run tests matching 14a on file change     | `make watch TEST=14a` |
| Lint                                                | `make lint`           |
| Run all tests, even slow ones                       | `make test_all`       |
| Run coverage testing                                | `make coverage`       |
| Update TypeScript external definitions              | `make tsd`            |
| Run the development server on port 4200             | `make serve`          |

## License
Satie is free software: you can redistribute it and/or modify it under the terms of
the [GNU **Affero** General Public License][agpl] as published by the Free Software
Foundation, either version 3 of the License, or (at your option) any later version.
The code is distributed WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU AGPL for more details.

Additional permissions under the GNU Affero GPL version 3 section 7:

 - If you modify this Program, or any covered work, by linking or combining it
with a general purpose web browser (excluding extensions and excluding add-ons),
the licensors of this Program grant you additional permission to convey the
resulting work.

 - You may distribute non-source (e.g., minimized or compacted) forms of
that code without the copy of the GNU GPL normally required by
section 4, provided you include this license notice and a URL
through which recipients can access the Corresponding Source.

 - If you modify this code, you may extend these exception to your version
of the code, but you are not obligated to do so. If you do not wish to do so,
delete this exception statement from your version.

If this license prevents you from using Satie in an open source project,
file an issue. I want to make it work!

[test_status]: https://magnum.travis-ci.com/jnetterf/satie.svg?token=CyuSS4hk66NJ4i9k2wRq&branch=master
[test_link]: https://magnum.travis-ci.com/jnetterf/satie
[musicxml_test_suite]: http://www.lilypond.org/doc/v2.18/input/regression/musicxml/collated-files.html
[agpl]: LICENSE.md
[musicxml]: http://en.wikipedia.org/wiki/MusicXML
[svg]: http://en.wikipedia.org/wiki/Scalable_Vector_Graphics
