/**
 * The Ripieno editor. 
 * (C) Josh Netterfield <joshua@nettek.ca> 2014-2015.
 */
 
import React = require("react");
let invariant = require("invariant");
import {find, throttle} from "lodash";

import {RenderTarget, ILinesLayoutMemo, ILinesLayoutState} from "./satie/src/engine";
import {ICollaborativeDocument} from "./actions/session";
import {getPage, getPrint, getTop} from "./satie/src/views";
import {AnyOperation} from "./ot";
import {IModel} from "./satie/src/engine";
import {get as getByPosition} from "./satie/src/views/metadata";

let _prevDebug: IModel = null;
class Editor extends React.Component<Editor.IProps, Editor.IState> {
    _svg: any;
    _pt: any;
    mouseMove = (ev: any) => {
        let svg: any = find(ev.path, (el: any) => el.tagName === "svg");
        if (!svg) {
            this._svg = null;
            return;
        }

        if (svg !== this._svg) {
            this._svg = svg;
            this._pt = this._svg.createSVGPoint();
        }

        let pt = this._pt;

        // Get point in global SVG space
        function cursorPoint(evt: React.MouseEvent) {
            pt.x = evt.clientX;
            pt.y = evt.clientY;
            return pt.matrixTransform(svg.getScreenCTM().inverse());
        }

        let p = cursorPoint(ev);
        this.handleCursorPosition(p);
    }
    handleCursorPosition = throttle((p: {x: number; y: number;}) => {
        let element = getByPosition(p);

        let path = element && element.key.match(/SATIE([0-9]*)_(\w*)_(\w*)_(\w*)_(\w*)_(\w*)/);
        if (!path) {
            if (_prevDebug !== null) {
                _prevDebug = null;
                this.props.debugSelected(null);
            }
            return;
        }
        
        path = path.slice(1);
        let measure: any = find(this.props.document.measures, (measure) => 1*measure.uuid === 1*path[0]);
        let el = measure[path[1]][path[2]][path[3]][path[4]][path[5]];
        if (el !== _prevDebug) {
            _prevDebug = el;
            this.props.debugSelected(el);
        }
        if (el) {
            el.toXML();
        }
    }, 18);

    render(): any {
        let {document, pageClassName} = this.props;
        let {memo$} = this.state;

        let page1 = getPage(this.props.document, 0, memo$, RenderTarget.SvgWeb, pageClassName);
        return <div onMouseMove={this.mouseMove}>
            {page1}
        </div>;
    }
    
    componentWillReceiveProps(props: Editor.IProps) {
        this._rectifyInternalState(props);
    }
    
    componentWillMount() {
        this._rectifyInternalState(this.props);
    }
    
    _rectifyInternalState(props: Editor.IProps) {
        let {document, operations} = props;
        let {memo$} = this.state;

        let print = getPrint(document, 0);
        let top = getTop(print, 0);
        if (!memo$) {
            memo$ = ILinesLayoutMemo.create(top);
        }
        memo$.y$ = top;

        this.setState({
            memo$,
        });
    }
    
    state: Editor.IState = {
        memo$: null
    };
}

module Editor {
    export interface IProps {
        debugSelected: (model: IModel) => void;
        document: ICollaborativeDocument;
        operations: AnyOperation[];
        pageClassName?: string;
    }
    export interface IState {
        memo$?: ILinesLayoutState;
    }
}

export default Editor;
