(TODO: CI)

# Makelily

Makelily is a set of graphical tools which generate Lilypond source.

It will be a deployed as a modal accessible in [Hacklily](https://github.com/hacklily/hacklily).

Part of the reason to isolate this to its own repo is to keep the above-average hackiness here isolated.
Architecturally, Makelily is independent from the rest of Hacklily and can be loaded asynchronously.

## Running locally

### Dependencies

You need:

- [Node](https://nodejs.org/en/) -- tested with Node 7, earlier versions may or may not also work
- [Yarn](https://yarnpkg.com/lang/en/docs/install/)

### Obtaining

To get makelily, run:

```bash
git clone git@github.com:hacklily/hacklily.git
```

Or, if you do not have ssh auth setup with Github:

```bash
git clone https://github.com/hacklily/hacklily.git
```

### Running

Once you have installed the above dependencies, run

```bash
make serve
```

## Contributing

Please do! Fork this repo and submit a PR. Your submission must be under the GPL.

You can reach the maintainer by email at `joshua@nettek.ca`.

## License

Out of respect for the Lilypond project that Hacklily relies on, and
to ensure all forks of Hacklily remain free software, the client is
licensed under the terms of the GNU GPL version 3 or later (with
additional permissions as described below), and the server is licensed
under the terms of the GNU AGPL version 3 or later.

### Client

This repo is licensed as follows:

```
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.

As additional permission under GNU GPL version 3 section 7, you
may distribute non-source (e.g., minimized or compacted) forms of
that code without the copy of the GNU GPL normally required by
section 4, provided you include this license notice and a URL
through which recipients can access the Corresponding Source.

As additional permission under GNU GPL version 3 section 7,
the term "System Libraries" is extended to include the JavaScript
libraries provided with any browser. If you modify this code, you
may extend this exception to your version of the code, but you are
not obligated to do so. If you do not wish to do so, delete this
exception statement from your version. 
```

## Deployment

Once I get around to it, whenever a commit is pushed to master, Travis will
deploy a new version to the gh-pages repo and probably also to npm.