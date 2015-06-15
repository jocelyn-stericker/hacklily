/// <reference path="../typings/tsd.d.ts" />

import React = require("react");
import ReactPerf = require("react/lib/ReactDefaultPerf");
import {init} from "satie";
import {run, HistoryLocation, Route, Redirect, DefaultRoute} from "react-router";

import App from "./app";
import Home from "./home";
import Tests from "./tests";

ReactPerf.start();
(<any>window).ReactPerf = ReactPerf;

let prefix = process.env.PLAYGROUND_PREFIX || "";

init({
    satieRoot: location.protocol + "//" + location.host + prefix + "/vendor/",
    preloadedFonts: ["Alegreya", "Alegreya (bold)"]
});

let routes = React.jsx(`
    <Route handler=${App} name="home" path=${prefix + "/"}>
        <DefaultRoute handler=${Home} />
        <Route name="tests" path="tests" handler=${Tests} />
        <Redirect from="tests/" to="tests" />
        <Route name="someTests" path="tests/:id" handler=${Tests} />
        <Redirect from="tests/:id/" to="someTests" />
    </Route>
`);

run(routes, HistoryLocation, function (Handler, state) {
    let params = state.params;
    React.render(React.jsx(`<Handler params=${params}/>`), document.getElementById("root"));
});
