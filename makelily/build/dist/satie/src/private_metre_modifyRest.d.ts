import { IAny } from "musicxml-interfaces/operations";
import { Document } from "./document";
import { ModelMetreMutationSpec } from "./engine_createPatch";
import { IFactory } from "./private_factory";
import { IAttributesSnapshot } from "./private_attributesSnapshot";
export interface IRestSpec {
    readonly song: string;
    readonly models: (ModelMetreMutationSpec | "killed")[];
    readonly modelsToKill: ModelMetreMutationSpec[][];
}
export declare function voiceToRestSpec(segment: ModelMetreMutationSpec[], attributes: IAttributesSnapshot, factory: IFactory | Document): {
    song: string;
    models: (ModelMetreMutationSpec | "killed")[];
    modelsToKill: ModelMetreMutationSpec[][];
};
export declare function simplifyRests(segment: (ModelMetreMutationSpec)[], factory: IFactory | Document, attributes: IAttributesSnapshot): IAny[];
