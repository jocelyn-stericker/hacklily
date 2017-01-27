/**
 * This file is part of Satie music engraver <https://github.com/jnetterf/satie>.
 * Copyright (C) Joshua Netterfield <joshua.ca> 2015 - present.
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

import {Time, BeamType, Beam, Count, BarStyleType, TimeModification} from "musicxml-interfaces";
import {IAny} from "musicxml-interfaces/operations";
import {
    buildNote, patchNote, INoteBuilder,
    buildBarline, patchBarline, IBarlineBuilder,
    buildBeam,
    buildAttributes, patchAttributes, IAttributesBuilder,
    buildPrint, patchPrint, IPrintBuilder,
} from "musicxml-interfaces/builders";
import {find, forEach, last, some, times, findIndex, findLastIndex, extend, isInteger} from "lodash";
import * as invariant from "invariant";

import {Document, IMeasure, IMeasurePart, ISegment, Type, IModel} from "./document";

import {IChord, count, dots, timeModification, divisions as calcDivisions,
    rest, countToIsBeamable, beams} from "./private_chordUtil";
import {IAttributesSnapshot} from "./private_attributesSnapshot";
import {getBeamingPattern} from "./private_metre_checkBeaming";
import {simplifyRests} from "./private_metre_modifyRest";
import {cloneObject} from "./private_util";

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
    private _document: Document;
    private _idx: number;

    get patches(): IAny[] {
        return this._patches.slice();
    }

    constructor(segment: ISegment, document: Document, idx?: number) {
        this._segment = segment;
        this._document = document;
        this._idx = idx;
    }

    at(idx: number) {
        this._idx = idx;
        return this;
    }

    next() {
        ++this._idx;
        return this;
    }

    barline(builder: (build: IBarlineBuilder) => IBarlineBuilder) {
        let model = this._segment[this._idx] as any;
        invariant(model, "no such model");
        invariant(this._document.modelHasType(model, Type.Barline), "model is not barline");
        this._patches = this._patches.concat(
            patchBarline(model, builder).map(_prependPatch(this._idx)));
        return this;
    }

    insertBarline(builder: (build: IBarlineBuilder) => IBarlineBuilder) {
        let li = buildBarline(builder);
        let p = [this._idx];
        this._patches = this._patches.concat({li, p});
        return this;
    }

    attributes(builder: (builder: IAttributesBuilder) => IAttributesBuilder) {
        let model = this._segment[this._idx] as any;
        invariant(model, "no such model");
        invariant(this._document.modelHasType(model, Type.Attributes), "model is not attributes");
        this._patches = this._patches.concat(
            patchAttributes(model, builder).map(_prependPatch(this._idx)));
        return this;
    }

    insertAttributes(builder: (build: IAttributesBuilder) => IAttributesBuilder) {
        let li = buildAttributes(builder);
        let p = [this._idx];
        this._patches = this._patches.concat({li, p});
        return this;
    }

    print(builder: (builder: IPrintBuilder) => IPrintBuilder) {
        let model = this._segment[this._idx] as any;
        invariant(model, "no such model");
        invariant(this._document.modelHasType(model, Type.Print), "model is not Print");
        this._patches = this._patches.concat(
        patchPrint(model, builder).map(_prependPatch(this._idx)));
        return this;
    }

    insertPrint(builder: (build: IPrintBuilder) => IPrintBuilder) {
        let li = buildPrint(builder);
        let p = [this._idx];
        this._patches = this._patches.concat({li, p});
        return this;
    }

    remove() {
        this._patches = this._patches.concat(
            {
                p: [this._idx],
                ld: this._segment[this._idx]
            }
        );
        return this;
    }
}

export class VoiceBuilder {
    private _segment: ISegment;
    private _patches: IAny[] = [];
    private _document: Document;
    private _idx: number;

    get patches(): IAny[] {
        return this._patches.slice();
    }

    constructor(segment: ISegment, document: Document, idx?: number) {
        this._segment = segment;
        this._document = document;
        this._idx = idx;
    }

    at(idx: number) {
        this._idx = idx;
        return this;
    }

    next() {
        ++this._idx;
        return this;
    }

    addVisualCursor() {
        this._patches = this._patches.concat(
            {
                li: {
                    _class: "VisualCursor",
                },
                p: [this._idx],
            }
        );
        return this;
    }

    note(noteIDX: number, builder: (build: INoteBuilder) => INoteBuilder) {
        let model = this._segment[this._idx] as any;
        invariant(model, "no such model");
        invariant(this._document.modelHasType(model, Type.Chord), "model is not a chord");
        let note = model[noteIDX];
        invariant(note, "invalid note");
        this._patches = this._patches.concat(
            patchNote(note, builder).map(_prependPatch(this._idx, "notes", noteIDX)));
        return this;
    }

    insertChord(builders: ((build: INoteBuilder) => INoteBuilder)[]) {
        invariant(!isNaN(this._idx), "%s must be a number", this._idx);
        let li: IChord = builders.map(builder => buildNote(builder));
        li._class = "Chord";
        invariant(li[0].noteType.duration, "Invalid note type");
        let p = [this._idx];
        this._patches = this._patches.concat({li, p});
        return this;
    }

    insertNote(position: number, builder: (builder: INoteBuilder) => INoteBuilder) {
        let model = this._segment[this._idx] as any;
        invariant(model, "no such model");
        invariant(this._document.modelHasType(model, Type.Chord), "model is not a chord");
        let li = buildNote(builder);
        let chord = model as IChord;
        invariant(chord[position - 1] || chord[position + 1] || !chord.length, "Invalid position for note");
        invariant(li.noteType.duration, "Invalid note type");
        let p = [this._idx, "notes", position];
        this._patches = this._patches.concat({p, li});
        return this;
    }

    remove() {
        this._patches = this._patches.concat(
            {
                p: [this._idx],
                ld: this._segment[this._idx]
            }
        );
        return this;
    }
}

export class PartBuilder {
    private _part: IMeasurePart;
    private _patches: IAny[] = [];
    private _document: Document;

    get patches(): IAny[] {
        return this._patches.slice();
    }

    constructor(part: IMeasurePart, document: Document) {
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
    private _document: Document;

    get patches(): IAny[] {
        return this._patches.slice();
    }

    constructor(measure: IMeasure, document: Document) {
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
    private _doc: Document;
    private _patches: IAny[] = [];

    get patches(): IAny[] {
        return this._patches.slice();
    }

    constructor(doc: Document) {
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

export class ModelMetreMutationSpec {
    idx: number;
    oldIdx: number;
    start: number;
    previousDivisions: number;
    newDivisions: number;
    newCount: number;
    newDots: number;
    newTimeModification: TimeModification;
    time: Time;
    rest: boolean;
    beam: Beam[];
    touched: boolean;
    private _originalModel: IModel;
    constructor(spec: {
                idx: number;
                oldIdx: number;
                start: number;
                previousDivisions: number;
                newDivisions: number;
                newCount: number;
                newDots: number;
                newTimeModification: TimeModification;
                time: Time;
                rest: boolean;
                beam: Beam[];
                touched: boolean;
            }, originalModel?: IModel) {
        extend(this, spec);
        this._originalModel = originalModel;
    }

    toSpec(): IModel {
        if (!this._originalModel) {
            throw new Error("Only valid for mutations!");
        }
        const originalModel = cloneObject(this._originalModel) as any;
        if (originalModel._class === "Chord" || originalModel.length) {
            const chordModel: IChord = originalModel;
            forEach(chordModel, c => {
                c.noteType.duration = this.newCount;
                if (this.rest) {
                    c.rest = {};
                    delete c.pitch;
                } else {
                    delete c.rest;
                }
                if (this.newTimeModification) {
                    c.timeModification = this.newTimeModification;
                } else {
                    delete c.timeModification;
                }
                if (!isNaN(this.newDots)) {
                    c.dots = times(this.newDots, () => ({}));
                } else {
                    delete c.dots;
                }
            });
            return chordModel as any;
        } else {
            return originalModel;
        }
    }
}

interface IMetreInfo {
    segments: {[key: string]: ISegment};
    attributes: {[key: string]: IAttributesSnapshot};
    elementInfos: {[key: string]: ModelMetreMutationSpec[]};
    elementInfoByChord: {[key: string]: ModelMetreMutationSpec};
}

function getMutationInfo(document: Document, patches: IAny[]) {
    const segments: {[key: string]: ISegment} = {};
    const attributes: {[key: string]: IAttributesSnapshot} = {};
    const elementInfos: {[key: string]: ModelMetreMutationSpec[]} = {};
    const elementInfoByChord: {[key: string]: ModelMetreMutationSpec} = {};

    patches.forEach(patch => {
        if (patch.p[0] === "measures") {
            // XXX: implement!
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
                    return elementInfo.concat(new ModelMetreMutationSpec({
                        idx: idx,
                        oldIdx: idx,
                        start: currDiv,
                        previousDivisions: 0,
                        newDivisions: 0,
                        newCount: 0,
                        newDots: 0,
                        newTimeModification: null,
                        time: time,
                        rest: true,
                        beam: null,
                        touched: false,
                    }, model));
                }
                let divs = calcDivisions(model, {time, divisions});
                let info = new ModelMetreMutationSpec({
                    idx: idx,
                    oldIdx: idx,
                    start: currDiv,
                    previousDivisions: divs,
                    newDivisions: divs,
                    newCount: count(model),
                    newDots: dots(model),
                    newTimeModification: timeModification(model),
                    time: time,
                    rest: !!rest(model),
                    beam: beams(model),
                    touched: false,
                }, model);
                elementInfoByChord[model.key] = info;
                currDiv += divs;
                return elementInfo.concat(info);
            }, [] as ModelMetreMutationSpec[]);
        }
        let divisions = attributes[segID].divisions;

        if (patch.p.length === 6) {
            if (patch.li) {
                const isChord = patch.li._class === "Chord";
                const b = isChord ? beams(patch.li) : null;
                const c = isChord ? count(patch.li) : 0;
                const d = isChord ? dots(patch.li) : 0;
                const tm = isChord ? timeModification(patch.li) : null;
                const isRest = isChord && !!rest(patch.li);
                const divs = isChord ?
                    calcDivisions(patch.li, {time: attributes[segID].time, divisions}) :
                    0;
                let start: number;
                const spliceIdx = parseInt(patch.p[5] as string, 10);
                invariant(isInteger(spliceIdx) && !isNaN(spliceIdx), "Expected an integer");
                if (spliceIdx === 0) {
                    start = 0;
                } else {
                    start = elementInfos[segID][spliceIdx - 1].newDivisions + elementInfos[segID][spliceIdx - 1].start;
                }

                let newInfo = new ModelMetreMutationSpec({
                    idx: spliceIdx,
                    oldIdx: undefined,
                    newCount: c,
                    newDivisions: divs,
                    newDots: d,
                    previousDivisions: 0,
                    newTimeModification: tm,
                    start: start,
                    time: attributes[segID].time,
                    rest: isRest,
                    beam: b,
                    touched: true,
                });

                for (let i = spliceIdx; i < elementInfos[segID].length; ++i) {
                    elementInfos[segID][i].start += divs;
                    elementInfos[segID][i].idx += 1;
                }

                elementInfos[segID].splice(spliceIdx, 0, newInfo);
            }
            if (patch.ld) {
                let divs = patch.ld._class === "Chord" ?
                    calcDivisions(patch.ld, {time: attributes[segID].time, divisions}) :
                    0;
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
            info.touched = true;
            if (patch.oi !== undefined) {
                info.rest = !patch.oi;
            } else if (patch.od !== undefined) {
                info.rest = true;
            }
        }

        if (patch.p.length === 9 && patch.p[8] === "rest") {
            info.touched = true;
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

        if (patch.p.length === 9 && patch.p[8] === "dots") {
            if (patch.oi) {
                info.newDots = patch.oi.length;
            } else if (patch.od) {
                info.newDots = 0;
            }
        }
        info.newDivisions = calcDivisions(
            {
                count: info.newCount,
                dots: info.newDots,
                timeModification: info.newTimeModification
            },
            {
                time: info.time,
                divisions,
            }
        );
        if (info.newDivisions !== info.previousDivisions) {
            info.touched = true;
        }
    });
    return {
        segments,
        attributes,
        elementInfos,
        elementInfoByChord
    };
}
function fixMetre(document: Document, patches: IAny[]): IAny[] {
    patches = patches.slice();

    let segments: {[key: string]: ISegment};
    let attributes: {[key: string]: IAttributesSnapshot};
    let elementInfos: {[key: string]: ModelMetreMutationSpec[]};

    const mi = getMutationInfo(document, patches);
    segments = mi.segments;
    attributes = mi.attributes;
    elementInfos = mi.elementInfos;

    forEach(elementInfos, (voiceInfo, key) => {
        const anyChanged = voiceInfo.some(n => n.touched);
        if (!anyChanged) {
            return;
        }

        const restSpecs = simplifyRests(voiceInfo, document, attributes[key]);

        patches = patches.concat(restSpecs.map((spec, idx) => (extend(
            {}, spec, {
                p: (key.split("++") as (number | string)[]).concat(spec.p),
            }
        ))));
    });

    return patches;
}

function fixBarlines(doc: Document, patches: IAny[]): IAny[] {
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

function fixCursor(doc: Document, patches: IAny[]): IAny[] {
    let {segments, attributes, elementInfos} = getMutationInfo(doc, patches);
    const newCursor = patches.filter(patch => patch.li && patch.li._class === "VisualCursor");
    if (!newCursor.length) {
        return patches;
    }
    invariant(newCursor.length === 1, "Limit 1 cursor operation per patch");
    patches = patches.slice();
    forEach(doc.measures, (measure) => {
        forEach(measure.parts, (part, partName) => {
            forEach(part.voices, (voice, voiceIDX) => {
                if (!voice) {
                    return;
                }
                const segID = [measure.uuid, "parts", partName, "voices", voiceIDX].join("++");
                const segInfo = elementInfos[segID];
                if (segInfo) {
                    let offset = 0;
                    forEach(segInfo, element => {
                        if (!isNaN(element.idx) && !isNaN(element.oldIdx) &&
                                doc.modelHasType(voice[element.oldIdx], Type.VisualCursor)) {
                            patches.push({
                                p: [measure.uuid, "parts", partName, "voices", voiceIDX, element.idx + offset],
                                ld: JSON.parse(JSON.stringify(voice[element.oldIdx])),
                            });
                            offset -= 1;
                        }
                    });
                } else {
                    let offset = 0;
                    forEach(voice, (el, idx) => {
                        if (doc.modelHasType(el, Type.VisualCursor)) {
                            patches.push({
                                p: [measure.uuid, "parts", partName, "voices", voiceIDX, idx + offset],
                                ld: JSON.parse(JSON.stringify(el)),
                            });
                            offset -= 1;
                        }
                    });
                }
            });
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

function addBeams(document: Document, patches: IAny[]): IAny[] {
    patches = patches.slice();

    let {segments, elementInfos} = getMutationInfo(document, patches);

    forEach(elementInfos, (voiceInfo, key) => {
        const segment = segments[key];
        const time = voiceInfo[0].time;
        const stdBP = getBeamingPattern(time); // TODO: TS changes in bar
        // const cleanBP = getBeamingPattern(time, "clean");
        // const altBP = getBeamingPattern(time, "alt");
        let prevInfo: ModelMetreMutationSpec;
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
                let next = calcDivisions(beamingPattern[bpIDX], {time, divisions: segment.divisions});
                divisionsInCurrentBucket += next;
            }
        }
        advanceBP(0);

        voiceInfo.forEach((elInfo, originalIdx) => {
            if (!elInfo.newDivisions) {
                // Skip this non-note.
                return;
            }
            let divs = calcDivisions(
                {
                    count: elInfo.newCount,
                    dots: elInfo.newDots,
                },
                {
                    time,
                    divisions: segment.divisions,
                },
                true
            );

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

function cleanupPatches(document: Document, patches: IAny[]): IAny[] {
    patches = fixMetre(document, patches);
    patches = addBeams(document, patches);
    patches = fixBarlines(document, patches);
    patches = fixCursor(document, patches);
    return patches;
}

export default function createPatch(
            isPreview: boolean,
            document: Document,
            measure: number,
            part: string,
            builder: (partBuilder: PartBuilder) => PartBuilder):
        IAny[];

export default function createPatch(
            isPreview: boolean,
            document: Document,
            builder: (build: DocumentBuilder) => DocumentBuilder):
        IAny[];

export default function createPatch(
            isPreview: boolean,
            document: Document,
            operations: IAny[]): IAny[];

export default function createPatch(isPreview: boolean,
        document: Document,
        builderOrMeasure: number | ((build: DocumentBuilder) => DocumentBuilder) | IAny[],
        part?: string,
        partBuilder?: (partBuilder: PartBuilder) => PartBuilder) {
    let patches: IAny[];
    if (builderOrMeasure instanceof Array) {
        patches = cleanupPatches(document, builderOrMeasure);
    } else if (typeof builderOrMeasure === "function") {
        invariant(part === undefined && partBuilder === undefined, "createPatch: invalid usage");
        let builder = builderOrMeasure as ((build: DocumentBuilder) => DocumentBuilder);
        patches = builder(new DocumentBuilder(document)).patches;
        if (!isPreview) {
            patches = cleanupPatches(document, patches);
        }
    } else {
        let measure = builderOrMeasure as any as number;
        let builder = partBuilder;
        patches = createPatch(isPreview, document, document => document
            .measure(measure, measure => measure
                .part(part, builder)));
    }
    return patches;
}
