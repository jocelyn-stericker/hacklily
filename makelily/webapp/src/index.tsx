/// <reference path="../typings/tsd.d.ts" />

import React = require("react");
var ReactDOM = require("react-dom");
import {init} from "../../src/index";
import {Router, Route, Redirect} from "react-router";

var createBrowserHistory = require("history/lib/createBrowserHistory");

import App from "./app";
import Home from "./home";
import Tests from "./tests";

let prefix = process.env.PLAYGROUND_PREFIX || "";

init({
    satieRoot: location.protocol + "//" + location.host + prefix + "/vendor/",
    preloadedFonts: ["Alegreya", "Alegreya (bold)"]
});

let history = createBrowserHistory();

ReactDOM.render(
    <Router history={history}>
        <Route component={App} path="">
            <Route path={`${prefix}/tests`}
                components={{
                    main: Tests,
                    header: Tests.Header,
                    description: Tests.Description
                }}/>
            <Redirect from={`${prefix}/tests/`} to={`${prefix}/tests`} />
            <Route path={`${prefix}/tests/:id`}
                components={{
                    main: Tests,
                    header: Tests.Header,
                    description: Tests.Description
                }}/>
            <Redirect from={`${prefix}/tests/:id/`} to={`${prefix}/tests/:id/`} />
            <Route path={`${prefix}/`}
                components={{
                    main: Home,
                    header: Home.Header,
                    description: Home.Description
                }}/>
            <Route path="*"
                components={{
                    main: Home,
                    header: Home.Header,
                    description: Home.Description
                }}/>
        </Route>
    </Router>,
    document.getElementById("root"));
