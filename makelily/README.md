Satie [![Test status][test_status]][test_link]
==============================================

Satie is a JavaScript library for rendering sheet music.

* Converts [MusicXML][musicxml] to [SVG][svg]. Most sheet music formats can be converted to MusicXML, and SVGs can be converted to many other formats.
* Runs in Node and modern browsers (Chrome, Firefox, Safari, IE 10+).
* Provides fast updates. Satie was designed to be a component of a sheet music editor.

Satie is not yet ready for production use.

## Contribute
Currently, the best way to contribute is by filing issues.

### Development Setup
To get started, you'll need [node 0.12](https://nodejs.org) and one of the following:

 - **Mac** (tested on Yosemite)
 - **Linux** with common development tools (`sudo apt-get install build-essential xsltproc`)
 - **Windows** with [msysgit](https://github.com/msysgit/msysgit/releases/) or similar and libxslt2 installed

To obtain Satie run,

```
git clone git@github.com:ripieno/satie.git
cd satie
```

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

### License
Ripieno is licensed under the [GNU **Affero** General Public License][agpl]. That means applications that use Satie, whether client-side or server-side, likely need to be open-source.


[test_status]: https://travis-ci.org/ripieno/satie.svg?branch=master
[test_link]: https://travis-ci.org/ripieno/satie
[musicxml_test_suite]: http://www.lilypond.org/doc/v2.18/input/regression/musicxml/collated-files.html
[agpl]: LICENSE.md
[musicxml]: http://en.wikipedia.org/wiki/MusicXML
[svg]: http://en.wikipedia.org/wiki/Scalable_Vector_Graphics
