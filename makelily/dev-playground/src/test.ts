import React = require("react");
import {Link} from "react-router";
import {importXML, IDocument, Viewer} from "satie";
import _ = require("lodash");

import Test from "./test";

const STYLES = require("./test.less");

class Tests extends React.Component<Tests.IProps, Tests.IState> {
    render() {
        let chrome = this.props.chrome !== false;
        let showFilterButton = chrome && this.props.showFilterButton;
        let link = showFilterButton ?
            React.jsx(`<Link to="someTests" params=${{id: this.props.name}}>
                    <button>hide others</button></Link>`) : null;
        if (this.state.error) {
            let errStr = "" + (<any>this.state.error).stack.toString();
            let lines = errStr.split("\n").map(s => React.jsx(`<div>${s}</div>`));
            return React.jsx(`<div className=${STYLES.test}>
                <h3>Test ${this.state.filename}&nbsp;&nbsp;${link}</h3>
                <code className=${STYLES.error}>
                    ${lines}
                </code>
            </div>`);
        }

        let document = this.state.document;
        if (!document) {
            return React.jsx(`<div>
                Loading...
            </div>`);
        }

        let misc = chrome && document.header.identification.miscellaneous;
        let descriptionField = chrome && _.find(misc && misc.miscellaneousFields,
                field => field.name === "description");
        let description = chrome && (descriptionField ?
                descriptionField.data :
                React.jsx(`<p>No description.</p>`));
        let title = chrome && React.jsx(`<h3>Test ${this.state.filename}&nbsp;&nbsp;${link}</h3>`);
        return React.jsx(`<div className=${STYLES.test}>
            ${title}
            ${description}
            <br />
            <Viewer document=${document} pageClassName=${STYLES.page} />
        </div>`);
    }

    state: Tests.IState = {
        filename: null,
        src: null,
        document: null
    };

    componentDidMount() {
        this.componentDidUpdate(null, null);
    }

    componentWillMount() {
        this.setState({
            filename: this.props.filename
        });
    }

    componentWillReceiveProps(nextProps: Tests.IProps) {
        if (this.props.filename !== nextProps.filename) {
            this.setState({
                filename: nextProps.filename,
                src: null,
                document: null
            });
        }
    }

    componentDidUpdate(prevProps: Tests.IProps, prevState: Tests.IState) {
        let prefix = process.env.PLAYGROUND_PREFIX || "";
        if (!this.state.src) {
            let request = new XMLHttpRequest();
            request.open("GET", prefix + this.state.filename);
            request.onload = () => {
                if (request.status !== 200) {
                    this.setState({
                        error: new Error("Status: " + request.status + "\n" + request.responseText),
                        src: request.responseText
                    });
                    return;
                }
                importXML(request.responseText,
                    (err: Error, doc: IDocument) => {
                        if (err) {
                            console.warn(err);
                            _.defer(() => {
                                this.setState({
                                    error: err,
                                    src: request.responseText
                                });
                            });
                        } else {
                            this.setState({
                                src: request.responseText,
                                document: doc
                            });
                        }
                    }
                );
            };
            request.send();
        }
    }
}

module Tests {
    export interface IProps {
        chrome?: boolean;
        name: string;
        showFilterButton: boolean;
        filename: string;
    }
    export interface IState {
        filename?: string;
        src?: string;
        document?: IDocument;
        error?: Error;
    }
}

export default Tests;
