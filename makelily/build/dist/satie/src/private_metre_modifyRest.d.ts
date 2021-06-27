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
export declare function voiceToRestSpec(segment: ModelMetreMutationSpec[], attributes: IAttributesSnapshot, _factory: IFactory | Document): {
    song: string;
    models: (ModelMetreMutationSpec | "killed")[];
    modelsToKill: ModelMetreMutationSpec[][];
};
export declare function simplifyRests(segment: ModelMetreMutationSpec[], factory: IFactory | Document, attributes: IAttributesSnapshot): IAny[];
