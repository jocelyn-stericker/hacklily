/// <reference path="./vendor/typings/tsd.d.ts" />

import Main from "./main";
import React = require("react");
import DAWComponent from "./dawComponent";

React.render(<Main />, document.getElementById("root"));

window.onbeforeunload = function() {
    // Give us a chance to clean things up.
    React.unmountComponentAtNode(document.getElementById("root"));
}