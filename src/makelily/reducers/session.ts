import {extend, omit} from "lodash";

import {AnyOperation} from "../ot";
import {ISessionAction as ISA, SessionAction as SA, ICollaborativeDocument} from "../actions/session";

export interface IAppState {
    operations?: AnyOperation[];
    rootDocument?: ICollaborativeDocument;
    error?: string;
}

let _reducers: {[key: string]: ((state: IAppState, action: ISA) => IAppState)} = {};

_reducers[SA[SA.EDIT]] = (state: IAppState, action: {operation: AnyOperation}) => {
    state = extend({}, state) as IAppState;
    state.operations = (state.operations || []).concat(action.operation);
    return state;
};

_reducers[SA[SA.SET_ROOT_DOCUMENT]] = (state: IAppState, action: {rootDocument: ICollaborativeDocument}) => {
    state = extend({}, state) as IAppState;
    state.operations = [];
    state.rootDocument = action.rootDocument;
    state.error = null;
    return state;
};

_reducers[SA[SA.SET_ERROR]] = (state: IAppState, action: {error: string}) => {
    state = extend({}, state) as IAppState;
    state.operations = [];
    state.rootDocument = null;
    state.error = action.error;
    return state;
};

export function reducer(state: IAppState, action: ISA) {
    if (action.type in _reducers) {
        return _reducers[action.type](state, action);
    }
    return state || {};
}