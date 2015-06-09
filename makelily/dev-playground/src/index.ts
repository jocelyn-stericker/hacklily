/// <reference path="../typings/tsd.d.ts" />

import React = require("react");
import Satie = require("satie");
import {run, HistoryLocation, Route, Redirect, DefaultRoute, NotFoundRoute} from "react-router";

import App = require("./app");
import Home = require("./home");
import Tests = require("./tests");

let prefix = process.env.PLAYGROUND_PREFIX || "";

Satie.init({
    satieRoot: location.protocol + "//" + location.host + prefix + "/vendor/",
    preloadedFonts: ["Alegreya", "Alegreya (bold)"]
});

var routes = React.jsx(`
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
