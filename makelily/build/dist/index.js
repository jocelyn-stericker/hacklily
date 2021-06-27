/**
 * @license
 * This file is part of Makelily.
 * Copyright (C) 2017 - present Jocelyn Stericker <jocelyn@nettek.ca>
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301  USA
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import * as React from "react";
import * as ReactDOM from "react-dom";
import App, { QUERY_PROP_KEYS } from "./App";
// http://stackoverflow.com/a/8648962
export function parseQuery(qstr) {
    var query = {};
    var a = (qstr[0] === "?" ? qstr.substr(1) : qstr).split("&");
    for (var _i = 0, a_1 = a; _i < a_1.length; _i++) {
        var item = a_1[_i];
        if (!item) {
            continue;
        }
        var b = item.split("=");
        query[decodeURIComponent(b[0])] = decodeURIComponent(b[1] || "");
    }
    return query;
}
// http://stackoverflow.com/a/5505137
export function toQueryString(obj) {
    var parts = [];
    for (var _i = 0, _a = Object.keys(obj); _i < _a.length; _i++) {
        var i = _a[_i];
        if (obj[i] !== undefined) {
            parts.push(encodeURIComponent(i) + "=" + encodeURIComponent(obj[i]));
        }
    }
    return parts.join("&").replace(/%2F/g, "/"); // because we can, and it's less ugly.
}
/**
 * Renders Hacklily, with props set.
 */
function render() {
    ReactDOM.render(React.createElement(App, __assign({}, getQueryProps(), { setQuery: setQuery })), document.getElementById("root"));
}
/**
 * Gets query props from the URL.
 */
function getQueryProps() {
    var queryObj = parseQuery(window.location.search);
    var query = {};
    Object.keys(queryObj).forEach(function (key) {
        var queryPropIdx = QUERY_PROP_KEYS.indexOf(key);
        if (queryPropIdx === -1) {
            console.warn("Warning: unknown query property " + key + ". " +
                "Please add it to QUERY_PROP_KEYS in App.tsx.");
            return;
        }
        // Note: queryPropKey === key, just typed correctly
        var queryPropKey = QUERY_PROP_KEYS[queryPropIdx];
        // @ts-ignore
        query[queryPropKey] = queryObj[key];
    });
    return query;
}
/**
 * Like React's setState, but for the URL query parameters.
 */
function setQuery(queryUpdates, replaceState) {
    if (replaceState === void 0) { replaceState = false; }
    var query = getQueryProps();
    Object.keys(queryUpdates).forEach(function (key) {
        if (key in queryUpdates) {
            // @ts-ignore
            query[key] = queryUpdates[key];
        }
    });
    var base = location.href.split("?")[0];
    var queryString = toQueryString(query);
    var newUrl = queryString.length ? base + "?" + queryString : base;
    if (replaceState) {
        history.replaceState(null, "", newUrl);
    }
    else {
        history.pushState(null, "", newUrl);
    }
    render();
}
/*
 * Init Hacklily.
 */
window.addEventListener("popstate", function (_ev) {
    render();
});
render();
//# sourceMappingURL=index.js.map