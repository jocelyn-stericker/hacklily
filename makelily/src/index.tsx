/**
 * The Ripieno editor. 
 * (C) Josh Netterfield <joshua@nettek.ca> 2014-2015.
 */

/// <reference path="../typings/tsd.d.ts" />

import React = require("react");
import ReactDOM = require("react-dom");
import {Router, Route} from "react-router";
import {Provider} from "react-redux";
import Store from "./store/index";

var createBrowserHistory = require("history/lib/createBrowserHistory");

import {init as initSatie} from "./satie/src/index";
import Yolo from "./yolo";

initSatie({
    satieRoot: "https://ripieno.github.io/satie/vendor/",
    preloadedFonts: ["Alegreya", "Alegreya (bold)"]
});

let history = createBrowserHistory();

ReactDOM.render(
    <Provider store={Store}>
        {() => <Router history={history}>
            <Route path="/" component={Yolo} />
        </Router>}
    </Provider>,
    document.getElementById("root")
);

// For debugging
(window as any).React = React;
(window as any).ReactDOM = ReactDOM;