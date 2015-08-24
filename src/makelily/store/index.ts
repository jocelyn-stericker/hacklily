import {createStore, applyMiddleware} from "redux";
var thunkMiddleware = require("redux-thunk");
var {compose} = require("redux");
import {extend} from "lodash";

import {reducer as sessionReducer} from "../reducers/session";

const finalCreateStore = process.env.NODE_ENV === "dev" ?
    compose(
        applyMiddleware(thunkMiddleware),
        require("redux-devtools").devTools(),
        createStore
    ) : 
    compose(
        applyMiddleware(thunkMiddleware),
        createStore
    );


let Store = finalCreateStore(sessionReducer, {});

export default Store;