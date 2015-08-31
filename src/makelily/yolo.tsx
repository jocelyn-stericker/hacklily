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
import {preview, loadConstDocument, ICollaborativeDocument, _rectify} from "./actions/session"

var {DevTools, DebugPanel, LogMonitor} = require('redux-devtools/lib/react');

import "whatwg-fetch";

var YoloStyle = require("./yolo.css");

function select(state: IAppState) {
    return state || {};
}
 
@connect(select)
class Yolo extends React.Component<IProps, IState> {
    state: IState = {}
    render() {
        if (this.props.rootDocument && !this.state.preview) {
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
        Store.dispatch(loadConstDocument("/lilypond-regression/01a.xml"));
        (window as any).yolo = (op: AnyOperation) => {
            console.time("yolo");
            console.time("dispatch");
            Store.dispatch(preview(op));
            console.timeEnd("dispatch");
            console.time("preview");
            this.setState({
                preview: true
            });
            console.timeEnd("preview");
            console.timeEnd("yolo");
        };
        (window as any).firstBar = () => this.props.rootDocument.measures[0].uuid;
    }

    componentWillReceiveProps(props: IProps) {
        this.setState({
            preview: false
        });
    }
}
export interface IProps extends IAppState {
    operations?: AnyOperation[];
    error?: string;
    rootDocument?: ICollaborativeDocument;
}

export interface IState {
    debugModel?: IModel;
    preview?: boolean;
}

export default Yolo
