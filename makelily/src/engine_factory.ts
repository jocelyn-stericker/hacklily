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

import {Print, Grouping, FiguredBass, Attributes, Sound, Direction, Harmony,
        Barline, Note} from "musicxml-interfaces";
import * as invariant from "invariant";
import {forEach, some} from "lodash";

import {IModel, Type} from "./document";
import ProxyExports from "./implProxy_proxyModel";
import SpacerExports from "./implSpacer_spacerModel";
import VisualCursorExports from "./implVisualCursor_visualCursorModel";

import {IFactory, IPreprocessor, IPostprocessor} from "./private_factory";
import {cloneObject} from "./private_util";
import {IChord} from "./private_chordUtil";
import {IAttributesSnapshot} from "./private_attributesSnapshot";

if (!(process as any).browser) {
    /* tslint:disable */
    require("source-map-support").install();
    /* tslint:enable */
}

export type ModelInstaller =
    (constructors: {
        [key: number]: any;
        [key: string]: Type;
    }) => void;

class Factory implements IFactory {
    preprocessors: IPreprocessor[];
    postprocessors: IPostprocessor[];
    private _constructors: { [key: number]: any; [key: string]: Type; } = {};

    constructor(models: ModelInstaller[], pre: IPreprocessor[] = [], post: IPostprocessor[] = []) {
        forEach(models, model => {
            model(this._constructors);
        });
        this.preprocessors = pre;
        this.postprocessors = post;
    }

    create(modelType: Type.Chord, options?: any): (IChord & IModel);
    create(modelType: Type.Print, options?: any): (Print & IModel);
    create(modelType: Type.Grouping, options?: any): (Grouping & IModel);
    create(modelType: Type.FiguredBass, options?: any): (FiguredBass & IModel);
    create(modelType: Type.Attributes, options?: any): (Attributes & IModel);
    create(modelType: Type.Sound, options?: any): (Sound & IModel);
    create(modelType: Type.Direction, options?: any): (Direction & IModel);
    create(modelType: Type.Harmony, options?: any): (Harmony & IModel);
    create(modelType: Type.Proxy, options?: any): ProxyExports.IProxyModel;
    create(modelType: Type.Spacer, options?: any): SpacerExports.ISpacerModel;
    create(modelType: Type.VisualCursor, options?: any): VisualCursorExports.IVisualCursorModel;
    create(modelType: Type.Barline, options?: any): (Barline & IModel);
    create(modelType: Type, options?: any): IModel;
    create(modelType: Type, options?: any): IModel {
        invariant((<number>modelType) in this._constructors,
            "The type with id=%s does not have a factory.",
            modelType);

        return new (<any>this._constructors[modelType])(options);
    }

    modelHasType(model: IModel, modelType: Type.Chord): model is (IChord & IModel);
    modelHasType(model: IModel, modelType: Type.Print): model is (Print & IModel);
    modelHasType(model: IModel, modelType: Type.Grouping): model is (Grouping & IModel);
    modelHasType(model: IModel, modelType: Type.FiguredBass): model is (FiguredBass & IModel);
    modelHasType(model: IModel, modelType: Type.Attributes): model is (Attributes & IModel &
        {_snapshot: IAttributesSnapshot});
    modelHasType(model: IModel, modelType: Type.Sound): model is (Sound & IModel);
    modelHasType(model: IModel, modelType: Type.Direction): model is (Direction & IModel);
    modelHasType(model: IModel, modelType: Type.Harmony): model is (Harmony & IModel);
    modelHasType(model: IModel, modelType: Type.Proxy): model is ProxyExports.IProxyModel;
    modelHasType(model: IModel, modelType: Type.Spacer): model is SpacerExports.ISpacerModel;
    modelHasType(model: IModel, modelType: Type.VisualCursor):
        model is VisualCursorExports.IVisualCursorModel;
    modelHasType(model: IModel, modelType: Type.Barline): model is (Barline & IModel);
    modelHasType(model: IModel, ...modelTypes: Type[]): boolean;
    modelHasType(model: IModel, ...modelTypes: Type[]): boolean {
        return some(modelTypes, modelType => {
            invariant((<number>modelType) in this._constructors,
                "The type with id=%s does not have a factory.",
                modelType);

            return model instanceof this._constructors[modelType] ||
                this._constructors[Type.Proxy] &&
                model instanceof this._constructors[Type.Proxy] &&
                    (<any>model)._target instanceof this._constructors[modelType];
        });
    }

    search(models: IModel[], idx: number, modelType: Type.Chord): (IChord & IModel)[];
    search(models: IModel[], idx: number, modelType: Type.Print): (Print & IModel)[];
    search(models: IModel[], idx: number, modelType: Type.Grouping): (Grouping & IModel)[];
    search(models: IModel[], idx: number, modelType: Type.FiguredBass): (FiguredBass & IModel)[];
    search(models: IModel[], idx: number, modelType: Type.Attributes): (Attributes & IModel)[];
    search(models: IModel[], idx: number, modelType: Type.Sound): (Sound & IModel)[];
    search(models: IModel[], idx: number, modelType: Type.Direction): (Direction & IModel)[];
    search(models: IModel[], idx: number, modelType: Type.Harmony): (Harmony & IModel)[];
    search(models: IModel[], idx: number, modelType: Type.Proxy): ProxyExports.IProxyModel[];
    search(models: IModel[], idx: number, modelType: Type.Spacer): SpacerExports.ISpacerModel[];
    search(models: IModel[], idx: number, modelType: Type.VisualCursor):
        VisualCursorExports.IVisualCursorModel[];
    /**
     * Returns all models in models with types `types` at the timestep of the model at models[idx],
     * or an empty array if none exist.
     */
    search(models: IModel[], idx: number, ...types: Type[]): IModel[] {
        let filtered: IModel[] = [];
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

    fromSpec<T extends {_class: "Note"}>(spec: T): (IChord & IModel);
    fromSpec(spec: Note): (IChord & IModel);
    fromSpec<T extends {_class: "Chord"}>(spec: T): (IChord & IModel);
    fromSpec<T extends {_class: "Print"}>(spec: T): (Print & IModel);
    fromSpec<T extends {_class: "Grouping"}>(spec: T): (Grouping & IModel);
    fromSpec<T extends {_class: "FiguredBass"}>(spec: T): (FiguredBass & IModel);
    fromSpec<T extends {_class: "Attributes"}>(spec: T): (Attributes & IModel);
    fromSpec<T extends {_class: "Sound"}>(spec: T): (Sound & IModel);
    fromSpec<T extends {_class: "Direction"}>(spec: T): (Direction & IModel);
    fromSpec<T extends {_class: "Harmony"}>(spec: T): (Harmony & IModel);
    fromSpec<T extends {_class: "Proxy"}>(spec: T): ProxyExports.IProxyModel;
    fromSpec<T extends {_class: "Spacer"}>(spec: T): SpacerExports.ISpacerModel;
    fromSpec<T extends {_class: "VisualCursor"}>(spec: T): VisualCursorExports.IVisualCursorModel
    fromSpec(spec: any): IModel;
    /**
     * Accepts a JSON string, or a plain object, and creates a spec.
     */
    fromSpec(spec: any): IModel {
        if (typeof spec === "string" || spec instanceof String) {
            spec = JSON.parse(<string> spec);
        } else {
            spec = cloneObject(spec);
        }

        if (!("_class" in spec)) {
            // It may be a note.
            invariant(spec[0] && spec[0]._class === "Note", "Specs must have the _class property set");
            spec._class = "Chord";
        }

        let sclass: Type = Type[spec._class] as any;
        invariant(sclass in this._constructors, "\"%s\" must be a known type", spec._class);

        return this.create(sclass, spec);
    }

    inspect(): string {
        return "[Factory]";
    }

    identity(model: IModel) {
        if ((<any>model)._omTarget) {
            return (<any>model)._omTarget;
        }
        return model;
    }
}

export default Factory;
