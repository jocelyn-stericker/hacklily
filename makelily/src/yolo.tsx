/**
 * The Ripieno editor. 
 * (C) Josh Netterfield <joshua@nettek.ca> 2014-2015.
 */
 
import React = require("react");
import {connect} from "react-redux";
import {indexBy} from "lodash";

import Editor from "./editor";
import {IMutableMeasure, IModel} from "./satie/src/engine";
import {AnyOperation} from "./ot";
import {IAppState} from "./reducers/session";

import Store from "./store/index";
import {edit, loadConstDocument, ICollaborativeDocument, _rectify} from "./actions/session"

var {DevTools, DebugPanel, LogMonitor} = require('redux-devtools/lib/react');

import "whatwg-fetch";

var YoloStyle = require("./yolo.css");

function select(state: IAppState) {
    return state || {};
}
 
@connect(select)
class Yolo extends React.Component<Yolo.IProps, {debugModel: IModel}> {
    state = {
        debugModel: null as IModel
    }
    render() {
        if (this.props.rootDocument) {
            _rectify(this.props.rootDocument, this.props.operations);
        }

       let {rootDocument, error} = this.props;
        if (error) {
            return <span className={YoloStyle.Yolo}>Something went wrong: {error}</span>
        }
        let text = "Loading...";
        if (this.state.debugModel) {
            text = `${this.state.debugModel.key} (inspect)\n\n${(this.state.debugModel as any).toXML()}`;
        } else if (rootDocument) {
           let editable = indexBy(rootDocument.measures, "uuid") as {[key: string]: IMutableMeasure};
           editable[0] = {
               parts: rootDocument.parts
           } as any;
           text = JSON.stringify(editable, null, 2);
        }
        
        return <span className={YoloStyle.Yolo}>
           {process.env.NODE_ENV === "dev" && <DebugPanel top right bottom>
               <DevTools store={Store} monitor={LogMonitor} />
           </DebugPanel>}
           <div className={YoloStyle.LeftPane}>
               <textarea value={text} readOnly />
           </div>
           <div className={YoloStyle.RightPane}>
               {rootDocument && <Editor document={rootDocument} pageClassName={YoloStyle.Page}
                   debugSelected={(debugModel) => this.setState({debugModel})}
                   operations={this.props.operations||[]} />}
           </div>
        </span>;
    }
    
    componentDidMount() {
       // For debugging
       Store.dispatch(loadConstDocument("https://ripieno.github.io/satie/lilypond-regression/01a.xml"));
       (window as any).yolo = (op: AnyOperation) => Store.dispatch(edit(op));
       (window as any).firstBar = () => this.props.rootDocument.measures[0].uuid;
    }
}

module Yolo {
    export interface IProps extends IAppState {
        operations?: AnyOperation[];
        error?: string;
        rootDocument?: ICollaborativeDocument;
    }
}

export default Yolo