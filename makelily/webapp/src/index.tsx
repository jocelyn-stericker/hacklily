/// <reference path="../../typings/tsd.d.ts" />
/// <reference path="../../dist/satie.d.ts" />

import * as React from "react";
import {render} from "react-dom";
import {Router, Route, Redirect} from "react-router";

const createBrowserHistory = require("history/lib/createBrowserHistory");

import App from "./app";
import Home from "./home";
import Tests from "./tests";

let prefix = process.env.PLAYGROUND_PREFIX || "";

let history = createBrowserHistory();

let rootInstance = render(
    <Router history={history}>
        <Route component={App} path="">
            <Route path={`${prefix}/tests`}
                components={{
                    main: Tests,
                    header: Tests.Header,
                    description: Tests.Description
                }} />
            <Redirect from={`${prefix}/tests/`} to={`${prefix}/tests`} />
            <Route path={`${prefix}/tests/:id`}
                components={{
                    main: Tests,
                    header: Tests.Header,
                    description: Tests.Description
                }} />
            <Redirect from={`${prefix}/tests/:id/`} to={`${prefix}/tests/:id/`} />
            <Route path={`${prefix}/`}
                components={{
                    main: Home,
                    header: Home.Header,
                    description: Home.Description
                }} />
            <Route path="*"
                components={{
                    main: Home,
                    header: Home.Header,
                    description: Home.Description
                }} />
        </Route>
    </Router>,
    document.getElementById("root"));

if ((module as any).hot) {
  require('react-hot-loader/Injection').RootInstanceProvider.injectProvider({
    getRootInstances: function () {
      // Help React Hot Loader figure out the root component instances on the page:
      return [rootInstance];
    }
  });
}
