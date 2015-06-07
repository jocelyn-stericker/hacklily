/**
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/ripieno/satie>.
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

import invariant    = require("react/lib/invariant");
import _            = require("lodash");

import Engine       = require("./engine");
import Util         = require("./engine/util");

class Factory implements Engine.IModel.IFactory {
    constructor(models: Array<(constructors: {
                [key: number]: any;
                [key: string]: Engine.IModel.Type;
            }) => void>) {
        _.forEach(models, model => {
            model(this._constructors);
        });
    }

    create(modelType: Engine.IModel.Type, options?: any): Engine.IModel {
        invariant((<number>modelType) in this._constructors, "The type with id=%s does not have a factory.", modelType);

        return new (<any>this._constructors[modelType])(options);
    }

    modelHasType(model: Engine.IModel, ...modelTypes: Engine.IModel.Type[]): boolean {
        return _.any(modelTypes, modelType => {
            invariant((<number>modelType) in this._constructors, "The type with id=%s does not have a factory.", modelType);

            return model instanceof this._constructors[modelType] ||
                this._constructors[Engine.IModel.Type.Proxy] &&
                model instanceof this._constructors[Engine.IModel.Type.Proxy] &&
                    (<any>model)._target instanceof this._constructors[modelType];
        });
    }

    /**
     * Returns all models in models with types `types` at the timestep of the model at models[idx],
     * or an empty array if none exist.
     */
    search(models: Engine.IModel[], idx: number, ...types: Engine.IModel.Type[]): Engine.IModel[] {
        let filtered: Engine.IModel[] = [];
        while (idx > 0 && !models[idx - 1].divCount) {
            --idx;
        }
        for (let i = idx; i < models.length; ++i) {
            if (this.modelHasType(models[i], ...types)) {
                filtered.push(models[i]);
            } else if (models[i].divCount) {
                break;
            }
        }
        return filtered;
    }

    fromSpec(spec: any): Engine.IModel {
        if (spec instanceof Object) {
            spec = Util.cloneObject(spec);
        } else if (typeof spec === "string" || spec instanceof String) {
            spec = JSON.parse(<string> spec);
        }
        if (!("_class" in spec)) {
            invariant(false, "fromSpec requires an MXMLJSON spec with a defined class");
        }
        var sclass: Engine.IModel.Type = <any> Engine.IModel.Type[spec._class];
        if (!(sclass in this._constructors)) {
            invariant(false, "Unknown type \"%s\"", spec._class);
        }
        return this.create(sclass, spec);
    }

    inspect(): string {
        return "[Factory]";
    }

    identity(model: Engine.IModel) {
        if ((<any>model)._omTarget) {
            return (<any>model)._omTarget;
        }
        return model;
    }

    private _constructors: { [key: number]: any; [key: string]: Engine.IModel.Type;} = {};
}

export = Factory;
