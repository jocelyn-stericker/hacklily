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
import { Print, Grouping, FiguredBass, Attributes, Sound, Direction, Harmony, Barline, Note } from "musicxml-interfaces";
import { IModel, Type } from "./document";
import ProxyExports from "./implProxy_proxyModel";
import SpacerExports from "./implSpacer_spacerModel";
import VisualCursorExports from "./implVisualCursor_visualCursorModel";
import { IFactory, IPreprocessor, IPostprocessor } from "./private_factory";
import { IChord } from "./private_chordUtil";
import { IAttributesSnapshot } from "./private_attributesSnapshot";
export declare type ModelInstaller = (constructors: {
    [key: number]: any;
    [key: string]: Type;
}) => void;
declare class Factory implements IFactory {
    preprocessors: IPreprocessor[];
    postprocessors: IPostprocessor[];
    private _constructors;
    constructor(models: ModelInstaller[], pre?: IPreprocessor[], post?: IPostprocessor[]);
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
    modelHasType(model: IModel, modelType: Type.Chord): model is (IChord & IModel);
    modelHasType(model: IModel, modelType: Type.Print): model is (Print & IModel);
    modelHasType(model: IModel, modelType: Type.Grouping): model is (Grouping & IModel);
    modelHasType(model: IModel, modelType: Type.FiguredBass): model is (FiguredBass & IModel);
    modelHasType(model: IModel, modelType: Type.Attributes): model is (Attributes & IModel & {
        _snapshot: IAttributesSnapshot;
    });
    modelHasType(model: IModel, modelType: Type.Sound): model is (Sound & IModel);
    modelHasType(model: IModel, modelType: Type.Direction): model is (Direction & IModel);
    modelHasType(model: IModel, modelType: Type.Harmony): model is (Harmony & IModel);
    modelHasType(model: IModel, modelType: Type.Proxy): model is ProxyExports.IProxyModel;
    modelHasType(model: IModel, modelType: Type.Spacer): model is SpacerExports.ISpacerModel;
    modelHasType(model: IModel, modelType: Type.VisualCursor): model is VisualCursorExports.IVisualCursorModel;
    modelHasType(model: IModel, modelType: Type.Barline): model is (Barline & IModel);
    modelHasType(model: IModel, ...modelTypes: Type[]): boolean;
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
    search(models: IModel[], idx: number, modelType: Type.VisualCursor): VisualCursorExports.IVisualCursorModel[];
    fromSpec<T extends {
        _class: "Note";
    }>(spec: T): (IChord & IModel);
    fromSpec(spec: Note): (IChord & IModel);
    fromSpec<T extends {
        _class: "Chord";
    }>(spec: T): (IChord & IModel);
    fromSpec<T extends {
        _class: "Print";
    }>(spec: T): (Print & IModel);
    fromSpec<T extends {
        _class: "Grouping";
    }>(spec: T): (Grouping & IModel);
    fromSpec<T extends {
        _class: "FiguredBass";
    }>(spec: T): (FiguredBass & IModel);
    fromSpec<T extends {
        _class: "Attributes";
    }>(spec: T): (Attributes & IModel);
    fromSpec<T extends {
        _class: "Sound";
    }>(spec: T): (Sound & IModel);
    fromSpec<T extends {
        _class: "Direction";
    }>(spec: T): (Direction & IModel);
    fromSpec<T extends {
        _class: "Harmony";
    }>(spec: T): (Harmony & IModel);
    fromSpec<T extends {
        _class: "Proxy";
    }>(spec: T): ProxyExports.IProxyModel;
    fromSpec<T extends {
        _class: "Spacer";
    }>(spec: T): SpacerExports.ISpacerModel;
    fromSpec<T extends {
        _class: "VisualCursor";
    }>(spec: T): VisualCursorExports.IVisualCursorModel;
    fromSpec(spec: any): IModel;
    inspect(): string;
    identity(model: IModel): any;
}
export default Factory;
