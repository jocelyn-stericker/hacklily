/** 
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the Dragon MIDI/audio library <https://github.com/ripieno/dragon>.
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/// <reference path="./vendor/typings/tsd.d.ts" />

import ReactDOM = require("react-dom");

/* tslint:disable */
import React = require("react"); // needed for <Main />.
/* tslint:enable */

import Main from "./main";

ReactDOM.render(<Main />, document.getElementById("root"));

window.onbeforeunload = function() {
    // give us a chance to clean things up.
    ReactDOM.unmountComponentAtNode(document.getElementById("root"));
};
