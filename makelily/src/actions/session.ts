/**
 * The Ripieno editor. 
 * (C) Josh Netterfield <joshua@nettek.ca> 2014-2015.
 */
 
import invariant = require("invariant");
import {ScoreHeader} from "musicxml-interfaces";
import {forEach, find, isEqual} from "lodash";

import {IAppState} from "../reducers/session";
import {AnyOperation, invert} from "../ot";
import {importXML, IDocument} from "../satie/src/index";
import {IModel, IMutableMeasure} from "../satie/src/engine";
import {getPage, getPrint, getTop} from "../satie/src/views";

import chordMutator from "../mutators/chord";

export type ThunkFn = (dispatch: (msg: any) => any, getState?: () => IAppState) => void;

export interface ICollaborativeDocument extends IDocument {
    /*---- Snapshot ------------------------------*/
    error?: any;
    factory?: IModel.IFactory;
    header?: ScoreHeader;
    measures?: IMutableMeasure[];
    parts?: string[];

    /**-------------------------------------------
     * The stack leading up to snapshot. This may be different than state.actions (e.g., when
     * time travelling). The renderer should call _rectify. _rectify is a no-op if there is nothing
     * to do.
     * 
     * In fact, the only reason we usually do transformations in the action at all is because it
     * makes for earlier and more graceful rejections.
     * 
     * Note: `state.actions` is the source of truth for the session state. When the document is
     * in a clean state, state.actions equals appliedOperations.
     */
    appliedOperations$: AnyOperation[];
}

/**
 * Applies an operation to the given document. Functions under "mutators/" are actually responsible
 * for actually doing the mutations.
 * 
 * CAREFUL: Does not touch `appliedOperations` because this function can also be used for undo. It's
 * the caller's responsibility to update `appliedOperations`.
 * 
 * @param op.p [measureUUID, ("part"|"voice")]
 */
function _applyOp$(doc$: IDocument, op: AnyOperation) {
    let path = op.p;
    let measureUUID = parseInt(String(path[0]), 10);
    let measure = find(doc$.measures, (measure) => measure.uuid === measureUUID);
    invariant(Boolean(measure), `Invalid operation path: no such measure ${path[0]}`);
    
    invariant(path[1] === "parts", `Invalid operation path: only parts is supported, not ${path[1]}`)
    
    let part = measure.parts[path[2]];
    invariant(Boolean(part), `Invalid operation path: no such part ${part}`);
    ++measure.version;
    
    invariant(path[3] === "voices" || path[3] === "staves",
        `Invalid operation path: ${path[3]} should have been "voices" or "staves`);

    if (path[3] === "voices") {
        let voice = part.voices[parseInt(String(path[4]), 10)];
        invariant(Boolean(voice), `Invalid operation path: No such voice ${path.slice(0,4).join(', ')}`);
        let element = voice[parseInt(String(path[5]), 10)];
        invariant(Boolean(element), `Invalid operation path: No such element ${path.slice(0,5).join(', ')}`);

        let localOp: AnyOperation = JSON.parse(JSON.stringify(op));
        localOp.p = path.slice(6);
        if (doc$.factory.modelHasType(element, IModel.Type.Chord)) {
            chordMutator(element as any, localOp);
        } else {
            invariant(false, "Invalid operation path: No reducer for", element);
        }
    } else if (path[3] === "staves") {
        console.log(part.staves);
        invariant(false, "Stave changes not implemented");
    }
}

export function _rectify(doc$: ICollaborativeDocument, operations: AnyOperation[]) {
    let displayVersion = () => doc$.appliedOperations$.length;
    let storeVersion = () => operations.length;
    let commonVersion = () => {
        let commonVersion = 0;
        let maxPossibleCommonVersion = Math.min(displayVersion(), storeVersion());
        for (var i = 0; i < maxPossibleCommonVersion; ++i) {
            if (isEqual(doc$.appliedOperations$[i], operations[i])) {
                ++commonVersion;
            } else {
                break;
            }
        }
        return commonVersion;
    };

    let initialCommon = commonVersion();
    if (displayVersion() > initialCommon) {
        forEach(invert(doc$.appliedOperations$.slice(initialCommon)), (op) => {
            _applyOp$(doc$, op);
            doc$.appliedOperations$.pop();
        });
    }

    if (displayVersion() < storeVersion()) {
        forEach(operations.slice(displayVersion()), (op) => {
            _applyOp$(doc$, op);
            doc$.appliedOperations$.push(op);
        });
    }

    invariant(displayVersion() === storeVersion(),
        "Something went wrong in _rectify. The current state is now invalid.");
}

export enum SessionAction {
    SET_ROOT_DOCUMENT,
    SET_ERROR,
    EDIT
}

export interface ISessionAction {
    type?: SessionAction;
}

export function setRootDocument(rootDocument: IDocument) {
    return {
        type: SessionAction[SessionAction.SET_ROOT_DOCUMENT],
        rootDocument
    }
}

export function error(error: string) {
    return {
        type: SessionAction[SessionAction.SET_ERROR],
        error
    }
}

export function loadConstDocument(url: string): ThunkFn {
    return (dispatch, getState) => {
        window.fetch(url)
           .then((response) => {
               return response.text();
           }).then((body) => {
               importXML(body,
                   (err: Error, document: IDocument) => {
                       if (err) {
                           dispatch(error("Failed to import document."));
                       } else {
                           (document as ICollaborativeDocument).appliedOperations$ = [];
                           dispatch(setRootDocument(document));
                       }
                   });
           }).catch((err) => {
               dispatch(error("Failed to acquire document."));
           });
    };
}

export function edit(operation: AnyOperation): ThunkFn {
    // We could just return the action, but we want to fail eariler if we're going to fail.
    return (dispatch, getState) => {
        let state = getState();
        let doc$ = state.rootDocument;
        let ok = true;
        try {
            // Apply to document snapshot, but not the actual state yet.
            _applyOp$(doc$, operation);
            doc$.appliedOperations$.push(operation);
        } catch(err) {
            // TODO: right now we could be in a really bad state if the change
            // partially applied. In the future, we should have a way of reloading from a known
            // good state for this type of situation.
            console.warn(err);
            ok = false;
        }
        if (ok) {
            dispatch({
                type: SessionAction[SessionAction.EDIT],
                operation: operation as any
            });
        }
    }
}

/**
 * Performs an action without committing it.
 */
export function preview(operation: AnyOperation): ThunkFn {
    return (dispatch, getState) => {
        let state = getState();
        let doc$ = state.rootDocument;
        let ok = true;
        // Reset to the documents state.
        _rectify(doc$, state.operations)

        try {
            // Apply to document snapshot, but not the actual state.
            _applyOp$(doc$, operation);
            doc$.appliedOperations$.push(operation);
        } catch(err) {
            // TODO: right now we could be in a really bad state if the change
            // partially applied. In the future, we should have a way of reloading from a known
            // good state for this type of situation.
            console.warn(err);
            ok = false;
        }

    }
}
