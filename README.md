# Hacklily

Hacklily is an online sheet-music editor and publishing tool. [Start writing music now!](https://hacklily.github.io)

It consists of a frontend [Lilypond](http://lilypond.org/) editor using [monaco](https://github.com/microsoft/monaco-editor) and a backend Lilypond renderer. It can publish songs directly to Github.

## License

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

## Running locally

### Dependencies

You need:

- [Node](https://nodejs.org/en/) -- tested with Node 7, earlier versions may or may not also work
- [Yarn](https://yarnpkg.com/lang/en/docs/install/)
- [Qt 5](https://www.qt.io/) -- with qmake in your path
- [Docker](https://www.docker.com/)

### Obtaining

To get hacklily, run:

```bash
git clone git@github.com:hacklily/hacklily.git
```

Or, if you do not have ssh auth setup with Github:

```bash
git clone https://github.com/hacklily/hacklily.git
```

### Running

#### Client

To run the frontend, run:

```bash
cd hacklily
yarn
env \
  REACT_APP_GITHUB_CLIENT_ID=your_github_api_client_id_here \
  REACT_APP_BACKEND_WS_URL=ws://localhost:2000 \
  yarn start
```

You can omit `REACT_APP_GITHUB_CLIENT_ID` if you do not want to enable the GitHub integration.
The port in `REACT_APP_BACKEND_WS_URL` should match the `--ws-port` argument you enter for the
server in the next step.

At this point, you should be able to navigate to `http://localhost:3000` to see the app, but you
will get an erro in the preview pane since the server is not running.

#### Server

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
  --github-admin-token your_github_admin_token_here \
  --github-org hacklily \
  --ws-port 2000
```

You can omit the `github-*` arguments if you do not want to enable the GitHub integration.

`github-admin-token` is a token with the `repo` scope for a user that has admin permissions of
the `github-org` you are developing with.

`ws-port` should match the port of the `REACT_APP_BACKEND_WS_URL` you entered above.

Then, in a browser navigate to [http://localhost:3000](http://localhost:3000).

## Contributing

Please do! Fork this repo and submit a PR. Your submission must be under the above license.

You can reach the maintainer by email at `joshua@nettek.ca`.
