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
