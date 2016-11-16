/**
 * @source: https://github.com/jnetterf/satie/
 *
 * @license
 * (C) Josh Netterfield <joshua@nettek.ca> 2016.
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

import {Time, BeamType, Beam, Count, BarStyleType} from "musicxml-interfaces";
import {IAny} from "musicxml-interfaces/operations";
import {
    buildNote, patchNote, INoteBuilder,
    buildBarline, patchBarline, IBarlineBuilder,
    buildBeam, buildAttributes, patchAttributes,
    IAttributesBuilder,
} from "musicxml-interfaces/builders";
import {find, forEach, last, some, times, findIndex, findLastIndex} from "lodash";
import * as invariant from "invariant";

import IDocument from "../document/document";
import IMeasure from "../document/measure";
import IMeasurePart from "../document/measurePart";
import ISegment from "../document/segment";
import Type from "../document/types";

import IChord, {count, dots, barDivisions,
    fromModel as chordFromModel, rest, countToIsBeamable, beams} from "../private/chord";
import IAttributesSnapshot from "../private/attributesSnapshot";
import {subtract, calcDivisionsNoCtx, _calcDivisions,
    getBeamingPattern} from "../private/metre";

// TODO: Get rid of all P1-hardcoding!

function _prependPatch(...prefix: any[]) {
    return function __prependPatch(patch: IAny) {
        patch.p = prefix.concat(patch.p);
        return patch;
    };
}

function genUUID(): number {
    const MAX_SAFE_INTEGER = 9007199254740991;
    return Math.floor(Math.random() * MAX_SAFE_INTEGER);
}

export class StaffBuilder {
    private _segment: ISegment;
    private _patches: IAny[] = [];
    private _document: IDocument;
    private _idx: number;

    get patches(): IAny[] {
        return this._patches.slice();
    }

    constructor(segment: ISegment, document: IDocument, idx?: number) {
        this._segment = segment;
        this._document = document;
        this._idx = idx;
    }

    barline(builder: (build: IBarlineBuilder) => IBarlineBuilder, idx = this._idx) {
        let model = this._segment[idx] as any;
        invariant(model, "no such model");
        invariant(this._document.modelHasType(model, Type.Barline), "model is not barline");
        this._patches = this._patches.concat(
            patchBarline(model, builder).map(_prependPatch(idx)));
        return this;
    }

    insertBarline(builder: (build: IBarlineBuilder) => IBarlineBuilder, idx = this._idx) {
        let li = buildBarline(builder);
        let p = [idx];
        this._patches = this._patches.concat({li, p});
        return this;
    }

    attributes(builder: (builder: IAttributesBuilder) => IAttributesBuilder, idx = this._idx) {
        let model = this._segment[idx] as any;
        invariant(model, "no such model");
        invariant(this._document.modelHasType(model, Type.Attributes), "model is not attributes");
        this._patches = this._patches.concat(
            patchAttributes(model, builder).map(_prependPatch(idx)));
        return this;
    }

    insertAttributes(builder: (build: IAttributesBuilder) => IAttributesBuilder, idx = this._idx) {
        let li = buildAttributes(builder);
        let p = [idx];
        this._patches = this._patches.concat({li, p});
        return this;
    }

    remove(idx: number) {
        this._patches = this._patches.concat(
            {
                p: [idx],
                ld: this._segment[idx]
            }
        );
        return this;
    }
}

export class VoiceBuilder {
    private _segment: ISegment;
    private _patches: IAny[] = [];
    private _document: IDocument;
    private _idx: number;

    get patches(): IAny[] {
        return this._patches.slice();
    }

    constructor(segment: ISegment, document: IDocument, idx?: number) {
        this._segment = segment;
        this._document = document;
        this._idx = idx;
    }

    note(noteIDX: number, builder: (build: INoteBuilder) => INoteBuilder, idx: number = this._idx) {
        let model = this._segment[idx] as any;
        invariant(model, "no such model");
        invariant(this._document.modelHasType(model, Type.Chord), "model is not a chord");
        let note = model[noteIDX];
        invariant(note, "invalid note");
        this._patches = this._patches.concat(
            patchNote(note, builder).map(_prependPatch(idx, "notes", noteIDX)));
        return this;
    }

    insertChord(builders: ((build: INoteBuilder) => INoteBuilder)[], idx = this._idx) {
        invariant(!isNaN(idx), "%s must be a number", idx);
        let li = builders.map(builder => buildNote(builder)) as IChord;
        li._class = "Chord";
        let p = [idx];
        this._patches = this._patches.concat({li, p});
        return this;
    }

    insertNote(position: number, builder: (builder: INoteBuilder) => INoteBuilder, idx = this._idx) {
        let model = this._segment[idx] as any;
        invariant(model, "no such model");
        invariant(this._document.modelHasType(model, Type.Chord), "model is not a chord");
        let li = buildNote(builder);
        let chord = model as IChord;
        invariant(chord[position - 1] || chord[position + 1] || !chord.length, "Invalid position for note");
        let p = [idx, "notes", position];
        this._patches = this._patches.concat({p, li});
        return this;
    }

    remove(idx: number) {
        this._patches = this._patches.concat(
            {
                p: [idx],
                ld: this._segment[idx]
            }
        );
        return this;
    }
}

export class PartBuilder {
    private _part: IMeasurePart;
    private _patches: IAny[] = [];
    private _document: IDocument;

    get patches(): IAny[] {
        return this._patches.slice();
    }

    constructor(part: IMeasurePart, document: IDocument) {
        this._part = part;
        this._document = document;
    }

    voice(voiceID: number, builder: (build: VoiceBuilder) => VoiceBuilder, idx?: number): this {
        const voice = this._part ? this._part.voices[voiceID] : null;
        invariant(!this._part || Boolean(voice), "invalid voice");
        this._patches = this._patches.concat(
            builder(new VoiceBuilder(voice, this._document, idx))
                .patches
                .map(_prependPatch("voices", voiceID))
        );
        return this;
    }

    staff(staffID: number, builder: (build: StaffBuilder) => StaffBuilder, idx?: number): this {
        const staff = this._part ? this._part.staves[staffID] : null;
        invariant(!this._part || Boolean(staff), "invalid staff");
        this._patches = this._patches.concat(
            builder(new StaffBuilder(staff, this._document, idx))
                .patches
                .map(_prependPatch("staves", staffID))
        );
        return this;
    }
}

export class MeasureBuilder {
    private _measure: IMeasure;
    private _patches: IAny[] = [];
    private _document: IDocument;

    get patches(): IAny[] {
        return this._patches.slice();
    }

    constructor(measure: IMeasure, document: IDocument) {
        this._measure = measure;
        this._document = document;
    }

    part(partID: string, builder: (build: PartBuilder) => PartBuilder): this {
        const part = this._measure ? this._measure.parts[partID] : null;
        invariant(!this._measure || Boolean(part), "invalid part id");
        this._patches = this._patches.concat(
            builder(new PartBuilder(part, this._document))
                .patches
                .map(_prependPatch("parts", partID))
        );
        return this;
    }
}

export class DocumentBuilder {
    private _doc: IDocument;
    private _patches: IAny[] = [];

    get patches(): IAny[] {
        return this._patches.slice();
    }

    constructor(doc: IDocument) {
        this._doc = doc;
    }

    measure(measureUUID: number, builder: (build: MeasureBuilder) => MeasureBuilder): this {
        let measure = find(this._doc.measures, it => it.uuid === measureUUID);
        invariant(Boolean(measure), `invalid measure uuid ${measureUUID}`);
        this._patches = this._patches.concat(
            builder(new MeasureBuilder(measure, this._doc))
                .patches
                .map(_prependPatch(measureUUID))
        );
        return this;
    }

    insertMeasure(measureIndex: number, builder: (build: MeasureBuilder) => MeasureBuilder, uuid: number = genUUID()): this {
        this._patches = this._patches.concat({
            li: {
                uuid,
            },
            p: ["measures", measureIndex],
        });

        this._patches = this._patches.concat(builder(new MeasureBuilder(null, this._doc))
            .patches
            .map(_prependPatch(uuid))
        );
        return this;
    }

    removeMeasure(measureIndex: number): this {
        this._patches = this._patches.concat({
            ld: JSON.parse(JSON.stringify(this._doc.measures[measureIndex])),
            p: ["measures", measureIndex],
        });

        return this;
    }
}

export default function createPatch(
            isPreview: boolean,
            document: IDocument,
            measure: number,
            part: string,
            builder: (partBuilder: PartBuilder) => PartBuilder):
        IAny[];

export default function createPatch(
            isPreview: boolean,
            document: IDocument,
            builder: (build: DocumentBuilder) => DocumentBuilder):
        IAny[];

export default function createPatch(isPreview: boolean,
        document: IDocument,
        builderOrMeasure: number | ((build: DocumentBuilder) => DocumentBuilder),
        part?: string,
        partBuilder?: (partBuilder: PartBuilder) => PartBuilder) {
    let patches: IAny[];
    if (typeof builderOrMeasure === "function") {
        invariant(part === undefined && partBuilder === undefined, "createPatch: invalid usage");
        let builder = builderOrMeasure as ((build: DocumentBuilder) => DocumentBuilder);
        patches = builder(new DocumentBuilder(document)).patches;
        if (!isPreview) {
            patches = fixMetre(document, patches);
            patches = addBeams(document, patches);
            patches = fixBarlines(document, patches);
        }
    } else {
        let measure = builderOrMeasure as number;
        let builder = partBuilder;
        patches = createPatch(isPreview, document, document => document
            .measure(measure, measure => measure
                .part(part, builder)));
    }
    return patches;
}

interface IElementInfo {
    idx: number;
    start: number;
    previousDivisions: number;
    newDivisions: number;
    newCount: number;
    newDots: number;
    time: Time;
    rest: boolean;
    beam: Beam[];
    touched: boolean;
}

interface IMetreInfo {
    segments: {[key: string]: ISegment};
    attributes: {[key: string]: IAttributesSnapshot};
    elementInfos: {[key: string]: IElementInfo[]};
    elementInfoByChord: {[key: string]: IElementInfo};
}

function getMutationInfo(document: IDocument, patches: IAny[]) {
    const segments: {[key: string]: ISegment} = {};
    const attributes: {[key: string]: IAttributesSnapshot} = {};
    const elementInfos: {[key: string]: IElementInfo[]} = {};
    const elementInfoByChord: {[key: string]: IElementInfo} = {};

    patches.forEach(patch => {
        if (patch.p[0] === "measures") {
            return;
        }
        let measureUUID = parseInt(patch.p[0] as string, 10);
        let measure = find(document.measures, doc => doc.uuid === measureUUID);
        if (!measure) {
            // TODO: validate blank measures
            return;
        }
        if (patch.p[1] !== "parts") {
            return;
        }
        const part = measure.parts[patch.p[2]];
        invariant(part, `part ${patch.p[2]} should exist in measure ${measureUUID}`);
        if (patch.p[3] === "staves") {
            return;
        }
        invariant(patch.p[3] === "voices", "only voices are supported here");
        const voice = part.voices[patch.p[4] as number];
        invariant(voice, `expected to find voice ${patch.p[4]} in part ${patch.p[2]} in measure ${measureUUID}`);

        const segID = patch.p.slice(0, 5).join("++");
        if (!segments[segID]) {
            segments[segID] = voice;
            let currDiv = 0;
            attributes[segID] = (document.search(part.staves[1], 0, Type.Attributes)[0] as any)._snapshot as IAttributesSnapshot;
            let time = attributes[segID].time; // TODO: TS changes
            let divisions = attributes[segID].divisions;

            elementInfos[segID] = voice.reduce((elementInfo, model, idx) => {
                if (!document.modelHasType(model, Type.Chord)) {
                    return elementInfo.concat({
                        idx: idx,
                        start: currDiv,
                        previousDivisions: 0,
                        newDivisions: 0,
                        newCount: 0,
                        newDots: 0,
                        time: time,
                        rest: true,
                        beam: null,
                        touched: false,
                    });
                }
                let chord = chordFromModel(model);
                let divs = calcDivisionsNoCtx(chord, time, divisions);
                let info = {
                    idx: idx,
                    start: currDiv,
                    previousDivisions: divs,
                    newDivisions: divs,
                    newCount: count(chord),
                    newDots: dots(chord),
                    time: time,
                    rest: !!rest(chord),
                    beam: beams(chord),
                    touched: false,
                };
                elementInfoByChord[model.key] = info;
                currDiv += divs;
                return elementInfo.concat(info);
            }, [] as IElementInfo[]);
        }
        let divisions = attributes[segID].divisions;

        if (patch.p.length === 6) {
            if (patch.li) {
                let c = count(patch.li);
                let d = dots(patch.li);
                let divs = calcDivisionsNoCtx(patch.li, attributes[segID].time, divisions);
                let start: number;
                let spliceIdx = parseInt(patch.p[5] as string, 10);
                if (spliceIdx === 0) {
                    start = 0;
                } else {
                    start = elementInfos[segID][spliceIdx - 1].newDivisions + elementInfos[segID][spliceIdx - 1].start;
                }

                let newInfo: IElementInfo = {
                    idx: spliceIdx,
                    newCount: c,
                    newDivisions: divs,
                    newDots: d,
                    previousDivisions: 0,
                    start: start,
                    time: attributes[segID].time,
                    rest: !!rest(patch.li),
                    beam: beams(patch.li),
                    touched: true,
                };

                for (let i = spliceIdx; i < elementInfos[segID].length; ++i) {
                    elementInfos[segID][i].start += divs;
                    elementInfos[segID][i].idx += 1;
                }

                elementInfos[segID].splice(spliceIdx, 0, newInfo);
            }
            if (patch.ld) {
                let divs = calcDivisionsNoCtx(patch.ld, attributes[segID].time, divisions);
                let spliceIdx = parseInt(patch.p[5] as string, 10);

                elementInfos[segID].splice(spliceIdx, 1);

                for (let i = spliceIdx; i < elementInfos[segID].length; ++i) {
                    elementInfos[segID][i].start -= divs;
                    elementInfos[segID][i].idx -= 1;
                }
            }
            return;
        }

        const el = voice[patch.p[5] as number];
        invariant(el, `expected to find element $${patch.p[5]} in part ${patch.p[2]} in voice ${patch.p[4]} in measure ${measureUUID}`);

        if (!document.modelHasType(el, Type.Chord) || patch.p[6] !== "notes" || patch.p[7] !== 0) {
            return;
        }

        let info = elementInfoByChord[el.key];

        if (patch.p.length === 9 && patch.p[8] === "pitch") {
            if (patch.oi !== undefined) {
                info.rest = !patch.oi;
            } else if (patch.od !== undefined) {
                info.rest = true;
            }
        }

        if (patch.p.length === 9 && patch.p[8] === "rest") {
            if (patch.oi !== undefined) {
                info.rest = !!patch.oi;
            } else if (patch.od !== undefined) {
                info.rest = false;
            }
        }

        if (patch.p[8] === "noteType" && patch.p[9] === "duration") {
            if (patch.oi) {
                info.newCount = patch.oi;
            } else {
                invariant(false, "noteType is required...");
            }
        }

        if (patch.p[8] === "dots" && patch.oi) {
            info.newDots = patch.oi.length;
        } else if (patch.p[8] === "dots" && patch.od) {
            info.newDots = 0;
        }
        // STOPSHIP: TIME MODIFICATION
        info.newDivisions = _calcDivisions(info.newCount, info.newDots, null, info.time, divisions);
        info.touched = true;
    });
    return {
        segments,
        attributes,
        elementInfos,
        elementInfoByChord
    };
}

function fixMetre(document: IDocument, patches: IAny[]): IAny[] {
    patches = patches.slice();

    let {segments, attributes, elementInfos} = getMutationInfo(document, patches);

    forEach(elementInfos, (voiceInfo, key) => {
        const segment = segments[key];
        let newIndex = 0;
        voiceInfo.forEach((elInfo, originalIdx) => {
            if (elInfo.newDivisions < elInfo.previousDivisions) {
                // We want to add rests to fill up any empty space.
                const end = elInfo.start + elInfo.newDivisions;

                const durationSpecs = subtract(elInfo.start + elInfo.previousDivisions,
                        end, {
                            division$: end,
                            staff: {
                                attributes: {
                                    time: attributes[key].time,
                                    divisions: segment.divisions,
                                },
                                totalDivisions: barDivisions(attributes[key]),
                            }
                        }, 0);

                const restSpecs: IChord[] = durationSpecs.map(durationSpec => {
                    let chord = [buildNote(note => note
                        .rest({})
                        .dots(durationSpec[0].dots)
                        .noteType(durationSpec[0].noteType))
                    ] as IChord;
                    chord._class = "Chord";
                    return chord;
                });

                patches = patches.concat(restSpecs.map((spec, idx) => ({
                    p: (key.split("++") as (number | string)[]).concat([
                        newIndex + 1 + idx
                    ]),

                    li: spec
                })));
                newIndex += restSpecs.length;
            } else if (elInfo.newDivisions > elInfo.previousDivisions) {
                // We want to remove rests that follow, if possible.
                let next = voiceInfo[originalIdx + 1];
                if (next && next.rest && next.newDivisions === next.previousDivisions && !next.touched) {
                    next.touched = true;
                    const newEnd = next.start + elInfo.newDivisions - elInfo.previousDivisions;
                    const durationSpecs = subtract(next.start + next.previousDivisions,
                            newEnd, {
                                division$: newEnd,
                                staff: {
                                    attributes: {
                                        time: attributes[key].time,
                                        divisions: segment.divisions,
                                    },
                                    totalDivisions: barDivisions(attributes[key]),
                                }
                            }, 0);

                    const restSpecs: IChord[] = durationSpecs.map(durationSpec => {
                        let chord = [buildNote(note => note
                            .rest({})
                            .dots(durationSpec[0].dots)
                            .noteType(durationSpec[0].noteType))
                        ] as IChord;
                        chord._class = "Chord";
                        return chord;
                    });

                    patches = patches.concat({
                        p: (key.split("++") as (number | string)[]).concat(newIndex + 1),
                        ld: JSON.parse(JSON.stringify(segment[originalIdx])),
                    });

                    patches = patches.concat(restSpecs.map((spec, idx) => ({
                        p: (key.split("++") as (number | string)[]).concat([
                            newIndex + 1 + idx
                        ]),

                        li: spec
                    })));

                    newIndex = newIndex - 1 + restSpecs.length;
                }
            }
            newIndex += 1;
        });
    });

    return patches;
}

function fixBarlines(doc: IDocument, patches: IAny[]): IAny[] {
    const measureCount = doc.measures.length;
    const previouslyLastMeasure = doc.measures[measureCount - 1];
    forEach(previouslyLastMeasure.parts, (part, partName) => {
        const segment = part.staves[1];
        const barlineIdx = findLastIndex(segment, el => doc.modelHasType(el, Type.Barline));

        patches = patches.slice();
        patches.forEach(patch => {
            if (patch.p[0] === "measures" &&
                    patch.p.length === 2 &&
                    patch.p[1] === previouslyLastMeasure.idx + 1) {

                const removeDoubleBarline = createPatch(false, doc,
                    previouslyLastMeasure.uuid, partName,
                    part => part.staff(1, staff => staff
                        .barline(barline => barline
                            .barStyle(barStyle => barStyle
                                .data(BarStyleType.Regular)
                            )
                        ),
                        barlineIdx
                    )
                );
                patches = patches.concat(removeDoubleBarline);
            }
        });
    });
    return patches;
}

const COUNT_TO_BEAMS: {[key: number]: number} = {
    [Count.Eighth]: 1,
    [Count._16th]: 2,
    [Count._32nd]: 3,
    [Count._64th]: 4,
    [Count._128th]: 5,
    [Count._256th]: 6,
    [Count._512th]: 7
};

function addBeams(document: IDocument, patches: IAny[]): IAny[] {
    patches = patches.slice();

    let {segments, elementInfos} = getMutationInfo(document, patches);

    forEach(elementInfos, (voiceInfo, key) => {
        const segment = segments[key];
        const time = voiceInfo[0].time;
        const stdBP = getBeamingPattern(time); // TODO: TS changes in bar
        // const cleanBP = getBeamingPattern(time, "clean");
        // const altBP = getBeamingPattern(time, "alt");
        let prevInfo: IElementInfo;
        let beamGroup: number[] = [];
        let beamBeams: number[] = [];
        let inCandidate: boolean[] = [];

        let beamingPattern: IChord[] = stdBP;

        function applyCandidate() {
            // Remove all rests at the end and beginning.
            const start = findIndex(beamGroup, i => !voiceInfo[i].rest);
            const end = findLastIndex(beamGroup, i => !voiceInfo[i].rest);
            beamBeams = beamBeams.slice(start, end + 1);
            beamGroup = beamGroup.slice(start, end + 1);

            if (beamGroup.length < 2) {
                return;
            }

            // Mark elements in the candidate
            beamGroup.forEach(b => inCandidate[b] = true);
            if (!some(beamGroup, i => voiceInfo[i].touched)) {
                // We did not modify this beam group, so don't change it here.
                return;
            }

            patches = patches.concat(beamGroup.map((i, j) => {
                let type: BeamType = null;
                const beams = times(beamBeams[j], beamNumber => {
                    if (i === beamGroup[0] || beamBeams[j - 1] < beamNumber + 1) {
                        if (i === last(beamGroup) || beamBeams[j + 1] < beamNumber + 1) {
                            // HACK HACK HACK -- it's more complex than this
                            type = (j === 0 ? BeamType.ForwardHook : BeamType.BackwardHook);
                        } else {
                            type = BeamType.Begin;
                        }
                    } else if (i === last(beamGroup) || beamBeams[j + 1] < beamNumber + 1) {
                        type = BeamType.End;
                    } else {
                        type = BeamType.Continue;
                    }

                    return buildBeam(beam => beam
                        .number(beamNumber + 1)
                        .type(type));
                });

                let miniP: IAny = {
                    p: (key.split("++") as (number | string)[]).concat([i, "notes", 0, "beams"]),
                    oi: beams
                };
                if (voiceInfo[i].beam) {
                    miniP.od = voiceInfo[i].beam;
                }
                return miniP;
            }));
        }

        let bpIDX = -1;
        let divisionsInCurrentBucket = 0;
        function advanceBP(divs: number) {
            divisionsInCurrentBucket -= divs;
            if (divisionsInCurrentBucket <= 0) {
                applyCandidate();
                prevInfo = null;
                beamGroup = [];
                beamBeams = [];
                ++bpIDX;
                if (!beamingPattern[bpIDX]) {
                    // End of bar / overflowed bar
                    divisionsInCurrentBucket = Infinity;
                    return;
                }
                let next = calcDivisionsNoCtx(beamingPattern[bpIDX], time, segment.divisions);
                divisionsInCurrentBucket += next;
            }
        }
        advanceBP(0);

        voiceInfo.forEach((elInfo, originalIdx) => {
            if (!elInfo.newDivisions) {
                // Skip this non-note.
                return;
            }
            let divs = _calcDivisions(elInfo.newCount, elInfo.newDots,
                                      null, time, segment.divisions);
            const isCandidate = countToIsBeamable[elInfo.newCount] &&
                (!elInfo.rest || elInfo.beam) &&
                divs <= divisionsInCurrentBucket;

            if (isCandidate) {
                prevInfo = elInfo;
                beamGroup.push(originalIdx);
                beamBeams.push(COUNT_TO_BEAMS[elInfo.newCount]);
            } else {
                applyCandidate();
                prevInfo = null;
                beamGroup = [];
                beamBeams = [];
            }
            advanceBP(divs);
        });
        applyCandidate();

        // Now remove invalid beams!
        voiceInfo.forEach((elInfo, i) => {
            if (elInfo.beam && !inCandidate[i]) {

                patches = patches.concat({
                    p: (key.split("++") as (number | string)[]).concat([i, "notes", 0, "beams"]),
                    od: elInfo.beam
                });
            }
        });
    });

    return patches;
}
