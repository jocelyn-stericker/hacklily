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
import { TimeModification, Time } from "musicxml-interfaces";
import { IChord } from "./private_chordUtil";
/**
 * Information needed to create a duration using makeDuration().
 *
 * See IChord and makeDuration().
 */
export interface ITimeSpec {
    /**
     * The base of the note, as encoded by LilyPond.
     *
     * A quarter note is '4', a half note is '8', ...
     */
    count: number;
    /**
     * The number of displayed dots, or null.
     */
    dots?: number;
    /**
     * The time modification (canonical tuplet), or null.
     */
    timeModification?: TimeModification;
}
export declare function makeDuration(divPerQuarter: number, time: Time, divisionsInDuration: number): IChord;
export declare const _512: IChord;
export declare const _256: IChord;
export declare const _256D: IChord;
export declare const _128: IChord;
export declare const _128D: IChord;
export declare const _64: IChord;
export declare const _64D: IChord;
export declare const _32: IChord;
export declare const _32D: IChord;
export declare const _16: IChord;
export declare const _16D: IChord;
export declare const _16DD: IChord;
export declare const _8: IChord;
export declare const _8D: IChord;
export declare const _8DD: IChord;
export declare const _4: IChord;
export declare const _4D: IChord;
export declare const _4DD: IChord;
export declare const _2: IChord;
export declare const _2D: IChord;
export declare const _2DD: IChord;
export declare const _1: IChord;
export declare const _1D: IChord;
export declare const _1DD: IChord;
export declare const _05: IChord;
