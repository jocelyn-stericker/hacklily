import { IModel } from "./document";
export interface ISegment extends Array<IModel> {
    owner: number;
    ownerType: "staff" | "voice";
    divisions: number;
    part?: string;
}
export interface IMeasurePart {
    voices: ISegment[];
    staves: ISegment[];
}
/**
 * Based on MusicXML's Measure, but with additional information, and with a staff/voice-seperated and
 * monotonic parts element.
 */
export interface IMeasure {
    idx: number;
    uuid: number;
    number: string;
    implicit?: boolean;
    width?: number;
    nonControlling?: boolean;
    parts: {
        [id: string]: IMeasurePart;
    };
    /**
     * Incremented whenever anything in the measure changes.
     * Local only and monotonic.
     */
    version: number;
}
export declare function getMeasureSegments(measure: IMeasure): ISegment[];
export declare function reduceToShortestInSegments(shortest: number, segment: ISegment): number;
export declare function reduceToShortestInSegment(shortest: number, model: IModel): number;
