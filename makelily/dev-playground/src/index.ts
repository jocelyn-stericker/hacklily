/// <reference path="../typings/tsd.d.ts" />

import React = require("react");
import Satie = require("satie");
import {run, HistoryLocation, Route, DefaultRoute, NotFoundRoute} from "react-router";

import App = require("./app");
import Home = require("./home");
import Tests = require("./tests");

Satie.init({
    useGoogleFonts: false
});

var routes = React.jsx(`
    <Route handler=${App} path="/">
        <DefaultRoute handler=${Home} />
        <Route name="tests" handler=${Tests} />
        <Route name="filteredTests" path="/tests/:id" handler=${Tests} />
    </Route>
`);

run(routes, HistoryLocation, function (Handler, state) {
    let params = state.params;
    React.render(React.jsx(`<Handler params=${params}/>`), document.body);
});
