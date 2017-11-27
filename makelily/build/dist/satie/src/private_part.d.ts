import { PartList, PartGroup, ScorePart } from "musicxml-interfaces";
export declare function scoreParts(scoreParts: PartList): ScorePart[];
export declare function groupsForPart(scoreParts: PartList, partID: string): PartGroup[];
