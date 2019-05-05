"use strict";
/**
 * @source: https://github.com/jnetterf/satie/
 *
 * @license
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/jnetterf/satie>.
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var invariant_1 = __importDefault(require("invariant"));
var lodash_1 = require("lodash");
var document_1 = require("./document");
var private_util_1 = require("./private_util");
var Factory = /** @class */ (function () {
    function Factory(models, pre, post) {
        var _this = this;
        if (pre === void 0) { pre = []; }
        if (post === void 0) { post = []; }
        this._constructors = {};
        lodash_1.forEach(models, function (model) {
            model(_this._constructors);
        });
        this.preprocessors = pre;
        this.postprocessors = post;
    }
    Factory.prototype.create = function (modelType, options) {
        invariant_1.default(modelType in this._constructors, "The type with id=%s does not have a factory.", modelType);
        return new this._constructors[modelType](options);
    };
    Factory.prototype.modelHasType = function (model) {
        var _this = this;
        var modelTypes = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            modelTypes[_i - 1] = arguments[_i];
        }
        return lodash_1.some(modelTypes, function (modelType) {
            invariant_1.default(modelType in _this._constructors, "The type with id=%s does not have a factory.", modelType);
            return model instanceof _this._constructors[modelType] ||
                _this._constructors[document_1.Type.Proxy] &&
                    model instanceof _this._constructors[document_1.Type.Proxy] &&
                    model._target instanceof _this._constructors[modelType];
        });
    };
    /**
     * Returns all models in models with types `types` at the timestep of the model at models[idx],
     * or an empty array if none exist.
     */
    Factory.prototype.search = function (models, idx) {
        var types = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            types[_i - 2] = arguments[_i];
        }
        var filtered = [];
        while (idx > 0 && !models[idx - 1].divCount) {
            --idx;
        }
        for (var i = idx; i < models.length; ++i) {
            if (this.modelHasType.apply(this, [models[i]].concat(types))) {
                filtered.push(models[i]);
            }
            else if (models[i].divCount) {
                break;
            }
        }
        return filtered;
    };
    /**
     * Accepts a JSON string, or a plain object, and creates a spec.
     */
    Factory.prototype.fromSpec = function (spec) {
        if (typeof spec === "string" || spec instanceof String) {
            spec = JSON.parse(spec);
        }
        else {
            spec = private_util_1.cloneObject(spec);
        }
        if (!("_class" in spec)) {
            // It may be a note.
            invariant_1.default(spec[0] && spec[0]._class === "Note", "Specs must have the _class property set");
            spec._class = "Chord";
        }
        var sclass = document_1.Type[spec._class];
        invariant_1.default(sclass in this._constructors, "\"%s\" must be a known type", spec._class);
        return this.create(sclass, spec);
    };
    Factory.prototype.inspect = function () {
        return "[Factory]";
    };
    Factory.prototype.identity = function (model) {
        if (model._omTarget) {
            return model._omTarget;
        }
        return model;
    };
    return Factory;
}());
exports.default = Factory;
//# sourceMappingURL=engine_factory.js.map