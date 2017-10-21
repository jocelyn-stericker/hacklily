
import * as React from "react";
import {render} from "react-dom";
import {Router, Route, Redirect, browserHistory} from "react-router";

import App from "./app";
import Home from "./home";
import Tests from "./tests";
import Sandbox from "./sandbox";

let prefix = process.env.PLAYGROUND_PREFIX || "";

let rootInstance = render(
    <Router history={browserHistory}>
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
            <Route path={`${prefix}/sandbox`}
                components={{
                    main: Sandbox,
                    header: Sandbox.Header
                }} />
            <Redirect from={`${prefix}/sandbox/`} to={`${prefix}/sandbox`} />
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
