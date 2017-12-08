/// <reference path="../../../../src/satie/src/opentypedist.d.ts" />
export declare function requireFont(name: string, url: string, style?: string, full?: boolean): void;
export declare function setRoot(root: string): void;
export declare function markPreloaded(name: string, style?: string): void;
export declare function whenReady(cb: (err?: Error) => void): void;
export declare function getTextBB(name: string, text: string, fontSize: number, style?: string): {
    bottom: number;
    left: number;
    right: number;
    top: number;
};
export declare function toPathData(name: string, text: string, x: number, y: number, fontSize: number, style?: string): string;
