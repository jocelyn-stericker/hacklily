[![Build Status](https://travis-ci.org/hacklily/hacklily.svg?branch=master)](https://travis-ci.org/hacklily/hacklily)

# Hacklily

Hacklily is an online sheet-music editor and publishing tool. [Start writing music now!](https://hacklily.org)

It consists of a frontend [Lilypond](http://lilypond.org/) editor using [monaco](https://github.com/microsoft/monaco-editor)
(the editor that powers vscode) and a backend Lilypond renderer. It can publish songs directly to GitHub.

## Running locally

### Dependencies

> **Important**: You do not need to install anything to run Hacklily in your browser. Hacklily supports all major browsers. To use it, just go to [https://www.hacklily.org](https://www.hacklily.org). The instructions below are for if you want to contribute to Hacklily or run the Hacklily development server _locally_.

You need:

- [Node](https://nodejs.org/en/) -- tested with Node 7, earlier versions may or may not also work
- [Yarn](https://yarnpkg.com/lang/en/docs/install/)
- [Qt 5](https://www.qt.io/) -- with qmake in your path (installing using the version from Qt's website is recommended on macOS)
- [Docker](https://www.docker.com/)

Note: I haven't tested this on Windows yet. Theoretically, this should work with something like MSYS, but I have not tried. 
If you manage to get it working, please make a pull request with instructions on how to do that.

### Obtaining

To get hacklily, run:

```bash
git clone git@github.com:hacklily/hacklily.git
```

Or, if you do not have ssh auth setup with Github:

```bash
git clone https://github.com/hacklily/hacklily.git
```

### Running (without GitHub integration)

Once you have installed the above dependencies, run

```bash
make serve
```

### Running (with GitHub integration)

**For most development, the steps in "Running" (above) are sufficient**.

If you specifically wish to test integration with GitHub, follow the steps in this section.

First, create a GitHub organization by following the steps at https://github.com/organizations/new.
Select the free plan.

Next, create a new app at https://github.com/organizations/<your-new-repo-name>/settings/applications,
making note of the client ID and secret. This application will be used to allow users to log in.

To run the frontend, in one shell run:

```bash
cd hacklily
yarn
env \
  REACT_APP_GITHUB_CLIENT_ID=your_github_api_client_id_here \
  REACT_APP_BACKEND_WS_URL=ws://localhost:2000 \
  yarn start
```

At this point, you should be able to navigate to `http://localhost:3000` to see the app, but you
will get an error in the preview pane since the server is not running.

In another shell, to run the backend, run:

```bash
cd hacklily/server
mkdir build
cd build
qmake ../ws-server
make
./ws-server \
  --renderer-path ../renderer \
  --renderer-docker-tag hacklily-renderer \
  --github-client-id your_github_api_client_id_here \
  --github-secret your_github_api_secret_here \
  --ws-port 2000
```

You can omit the `github-*` arguments if you do not want to enable the GitHub integration.

`ws-port` should match the port of the `REACT_APP_BACKEND_WS_URL` you entered above.

Then, in a browser navigate to [http://localhost:3000](http://localhost:3000).

## Contributing

Please do! Fork this repo and submit a PR. Your submission must be under the appropriate
license (GPL for client code, AGPL for server code).

You can reach the maintainer by email at `joshua@nettek.ca`.

## License

Out of respect for the Lilypond project that Hacklily relies on, and
to ensure all forks of Hacklily remain free software, the client is
licensed under the terms of the GNU GPL version 3 or later (with
additional permissions as described below), and the server is licensed
under the terms of the GNU AGPL version 3 or later.

### Client

Everything except for the server (located in `server/`) is licensed as follows:

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

A full copy of the GPL version 3 is available in LICENSE.txt.

### Server

The server (located in `server/`) is licensed as follows:

```
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
```

A full copy of the AGPL version 3 is available in LICENSE.AGPL.txt.


## Deployment

Whenever a commit is pushed to master, Travis will deploy a new version.

`make deploy` updates https://github.com/hacklily/hacklily.github.io. When these files change,
GitHub starts serving new files to https://www.hacklily.org.
