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
import createPatch from "./engine_createPatch";
import { Type } from "./document";
import { cloneObject } from "./private_util";
/**
 * Holds information about the context in which an element is processed.
 * Also contains functions to modify the document when processing an element.
 */
var ValidationCursor = /** @class */ (function () {
    function ValidationCursor(spec) {
        this.document = spec.document;
        this.segmentDivision = 0;
        this.factory = spec.factory;
        this.header = spec.header;
        this.segmentPosition = 0;
        this.print = spec.print;
        this.segmentInstance = spec.segment;
        this.staffAttributes = spec.staffAttributes;
        this.staffAccidentals = spec.staffAccidentals;
        this.measureInstance = spec.measureInstance;
        this.measureIsLast = spec.measureIsLast;
        this.staffIdx = spec.staffIdx;
        this.preview = !!spec.preview;
        this.fixup = spec.fixup;
        this.singleLineMode = spec.singleLineMode;
    }
    ValidationCursor.prototype.const = function () {
        return this;
    };
    ValidationCursor.prototype.dangerouslyPatchWithoutValidation = function (builder) {
        var _this = this;
        // Create the patch based on whether the current context is a staff context or a voice context.
        var patch = createPatch(true, this.document, this.measureInstance.uuid, this.segmentInstance.part, function (part) {
            if (_this.segmentInstance.ownerType === "staff") {
                return part.staff(_this.segmentInstance.owner, builder, _this.segmentPosition);
            }
            else if (_this.segmentInstance.ownerType === "voice") {
                return part.voice(_this.segmentInstance.owner, builder, _this.segmentPosition);
            }
            else {
                throw new Error("Not reached");
            }
        });
        // All patches must be serializable, so we can:
        //   - Send them over a network
        //   - Invert them
        this.fixup(cloneObject(patch));
    };
    ValidationCursor.prototype.patch = function (builder, _dangerous) {
        var _this = this;
        // Create the patch based on whether the current context is a staff context or a voice context.
        var patch = createPatch(this.preview, this.document, this.measureInstance.uuid, this.segmentInstance.part, function (part) {
            if (_this.segmentInstance.ownerType === "staff") {
                return part.staff(_this.segmentInstance.owner, builder, _this.segmentPosition);
            }
            else if (_this.segmentInstance.ownerType === "voice") {
                return part.voice(_this.segmentInstance.owner, builder, _this.segmentPosition);
            }
            else {
                throw new Error("Not reached");
            }
        });
        // All patches must be serializable, so we can:
        //   - Send them over a network
        //   - Invert them
        this.fixup(cloneObject(patch));
    };
    ValidationCursor.prototype.advance = function (divs) {
        invariant(this.segmentInstance.ownerType === "staff", "Only valid in staff context");
        this.segmentDivision += divs;
        this.fixup([
            {
                p: [
                    String(this.measureInstance.uuid),
                    "parts",
                    this.segmentInstance.part,
                    "staves",
                    this.segmentInstance.owner,
                    this.segmentPosition,
                ],
                li: {
                    _class: Type[Type.Spacer],
                    divCount: divs,
                },
            },
        ]);
    };
    return ValidationCursor;
}());
export { ValidationCursor };
var LayoutCursor = /** @class */ (function () {
    function LayoutCursor(spec) {
        this._validationCursor = spec.validationCursor;
        this.segmentX = spec.x;
        this.measureX = spec.measureX;
        this.lineShortest = spec.lineShortest;
        this.lineBarOnLine = spec.lineBarOnLine;
        this.lineTotalBarsOnLine = spec.lineTotalBarsOnLine;
        this.lineIndex = spec.lineIndex;
        this.lineCount = spec.lineCount;
        this.lineMaxPaddingBottomByStaff = [];
        this.lineMaxPaddingTopByStaff = [];
    }
    Object.defineProperty(LayoutCursor.prototype, "document", {
        // ...extends readonly ValidationCursor {
        get: function () {
            return this._validationCursor.document;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LayoutCursor.prototype, "segmentInstance", {
        get: function () {
            return this._validationCursor.segmentInstance;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LayoutCursor.prototype, "segmentPosition", {
        get: function () {
            return this._validationCursor.segmentPosition;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LayoutCursor.prototype, "segmentDivision", {
        get: function () {
            return this._validationCursor.segmentDivision;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LayoutCursor.prototype, "staffAttributes", {
        get: function () {
            return this._validationCursor.staffAttributes;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LayoutCursor.prototype, "staffAccidentals", {
        get: function () {
            return this._validationCursor.staffAccidentals;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LayoutCursor.prototype, "staffIdx", {
        get: function () {
            return this._validationCursor.staffIdx;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LayoutCursor.prototype, "measureInstance", {
        get: function () {
            return this._validationCursor.measureInstance;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LayoutCursor.prototype, "print", {
        get: function () {
            return this._validationCursor.print;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LayoutCursor.prototype, "header", {
        get: function () {
            return this._validationCursor.header;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LayoutCursor.prototype, "factory", {
        get: function () {
            return this._validationCursor.factory;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LayoutCursor.prototype, "preview", {
        get: function () {
            return this._validationCursor.preview;
        },
        enumerable: true,
        configurable: true
    });
    return LayoutCursor;
}());
export { LayoutCursor };
//# sourceMappingURL=private_cursor.js.map