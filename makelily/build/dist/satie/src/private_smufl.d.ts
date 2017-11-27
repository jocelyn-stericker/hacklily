/// <reference types="lodash" />
export { default as bravura } from "./private_smufl_bravura";
export declare let bboxes: {
    [key: string]: any[];
};
export declare let getGlyphCode: ((name: string) => string) & _.MemoizedFunction;
/**
 * Calculates where a notation should begin.
 */
export declare function getFontOffset(notehead: string, direction: number): any;
export declare let distances: {
    beam: number;
    hyphen: number;
};
export declare function getWidth(glyph: string): number;
export declare function getRight(glyph: string): number;
export declare function getLeft(glyph: string): number;
export declare function getTop(glyph: string): number;
export declare function getBottom(glyph: string): number;
