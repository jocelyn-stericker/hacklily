/**
 * This file is part of Satie music engraver <https://github.com/emilyskidsister/satie>.
 * Copyright (C) Jocelyn Stericker <jocelyn@nettek.ca> 2015 - present.
 *
 * Satie is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * Satie is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Satie.  If not, see <http://www.gnu.org/licenses/>.
 */
import invariant from "invariant";
import { isEqual, sortedIndex, indexOf } from "lodash";
/**
 * A decorator that records the position of a component.
 */
export function Targetable() {
    return function decorator(component) {
        function updateMeta(self, props) {
            var layout = props.layout;
            var originX = props.originX;
            var originY = self.context.originYByPartAndStaff[layout.part][layout.model.staffIdx || 1] || 0;
            var newRecord = {
                key: props.layout.key,
                obj: self,
                x1: originX + props.layout.x - 2,
                x2: originX + props.layout.x + props.layout.renderedWidth,
                y1: originY - 60,
                y2: originY + 60,
                originY: originY,
            };
            if (self._record) {
                if (isEqual(newRecord, self._record)) {
                    return;
                }
                clearMeta(self);
            }
            if (isNaN(props.layout.renderedWidth)) {
                console.warn("Missing rendered width in", props.layout.key);
                return;
            }
            self._record = {
                key: props.layout.key,
                obj: self,
                x1: originX + props.layout.x - 2,
                x2: originX + props.layout.x + props.layout.renderedWidth,
                y1: originY - 60,
                y2: originY + 60,
                originY: originY,
            };
            set(self._record);
        }
        function clearMeta(self) {
            clear(self._record);
            self._record = null;
        }
        // ---- //
        var originalComponentWillMount = component.prototype.UNSAFE_componentWillMount;
        component.prototype.UNSAFE_componentWillMount = function metaComponentWillMountWrapper() {
            var self = this;
            updateMeta(self, self.props);
            if (originalComponentWillMount) {
                originalComponentWillMount.call(self);
            }
        };
        // ---- //
        var originalComponentWillUnmount = component.prototype.componentWillUnmount;
        component.prototype.componentWillUnmount = function metaComponentWillUnmountWrapper() {
            var self = this;
            clearMeta(self);
            if (originalComponentWillUnmount) {
                originalComponentWillUnmount.call(self);
            }
        };
        // ---- //
        var originalComponentWillReceiveProps = component.prototype.UNSAFE_componentWillReceiveProps;
        component.prototype.UNSAFE_componentWillReceiveProps = function metaComponentWillReceiveProps(nextProps) {
            var self = this;
            updateMeta(self, nextProps);
            if (originalComponentWillReceiveProps) {
                originalComponentWillReceiveProps.call(self);
            }
        };
    };
}
var _sorted = [];
var _weights = [];
function set(record) {
    var weight = weightForRecord(record);
    var idx = sortedIndex(_weights, weight);
    _sorted.splice(idx, 0, record);
    _weights.splice(idx, 0, weight);
}
function clear(record) {
    var weight = weightForRecord(record);
    var firstPossibleIdx = sortedIndex(_weights, weight);
    var idx = indexOf(_sorted, record, firstPossibleIdx);
    invariant(idx >= 0, record.key + " not currently in array.");
    _sorted.splice(idx, 1);
    _weights.splice(idx, 1);
}
export function get(lookup) {
    var x = lookup.x, y = lookup.y;
    var weight = weightForLookup(lookup);
    var firstPossibleIdx = sortedIndex(_weights, weight);
    for (var i = firstPossibleIdx; i < _sorted.length; ++i) {
        var record = _sorted[i];
        if (_sorted[i].x1 <= x &&
            _sorted[i].x2 >= x &&
            _sorted[i].y1 <= y &&
            _sorted[i].y2 >= y) {
            return record;
        }
    }
    return null;
}
function weightForRecord(record) {
    // In the future we should seperate by line.
    return record.x2;
}
function weightForLookup(lookup) {
    return lookup.x;
}
//# sourceMappingURL=private_views_metadata.js.map