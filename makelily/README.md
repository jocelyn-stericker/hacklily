Satie
=====

A MusicXML renderer that uses React and SMuFL. It's in active development, and is in alpha.
The current goal is to pass Lilypond's unofficial MusicXML test suite.

## Copyright
Copyright (C) 2015 Josh Netterfield <joshua@nettek.ca>.

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU **Affero** General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU **Affero** General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.

## Usage
Satie is not ready for usage. Watch this space.

## Contributing
This project is not currently accepting pull requests. You can submit issues, however all current work will be on getting Lilypond's unoffical test suite fully supported.

### Development Setup
To get started, you'll need [node 0.12](https://nodejs.org) and one of the following:

 - **Mac** (tested on Yosemite)
 - **Linux** with make (`sudo apt-get install build-essential`)
 - **Windows** with [msysgit](https://github.com/msysgit/msysgit/releases/) or similar and libxslt2 installed

To obtain Satie run,

```
git clone git@github.com:ripieno/satie.git
cd satie
```

### Building
To build, lint, and run unit tests:

| Task                                                | Command         |
|-----------------------------------------------------|-----------------|
| Build and run unit tests                            | `make`          |
| Build and unit test whenever a file changes         | `make watch`    |
| Lint                                                | `make lint`     |
| Run all tests, even slow ones                       | `make test_all` |
| Update TypeScript external definitions              | `make tsd`      |
