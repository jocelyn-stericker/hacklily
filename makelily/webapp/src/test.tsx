import React = require("react");
import {Link} from "react-router";
import {importXML, IDocument, Viewer} from "../../src/index";
import {find, defer} from "lodash";

import {prefix} from "./config";
const STYLES = require("./test.css");

class Test extends React.Component<Test.IProps, Test.IState> {
    state: Test.IState = {
        filename: null,
        src: null,
        document: null
    };

    render() {
        let chrome = this.props.chrome !== false;
        let showFilterButton = chrome && this.props.showFilterButton;
        let link = showFilterButton ?
            <Link to={`${prefix}/tests/${this.props.name}`}>
                    <button>hide others</button></Link> : null;
        if (this.state.error) {
            let errStr = "" + (this.state.error as any).stack.toString();
            let lines = errStr.split("\n").map(s => <div>{s}</div>);
            return <div className={STYLES.test}>
                <h3>Test {this.state.filename}&nbsp;&nbsp;{link}</h3>
                <code className={STYLES.error}>
                    {lines}
                </code>
            </div>;
        }

        let document = this.state.document;
        if (!document) {
            return <div>
                Loading...
            </div>;
        }

        let misc = chrome && document.header.identification.miscellaneous;
        let descriptionField = chrome && find(misc && misc.miscellaneousFields,
                (field: any) => field.name === "description"); // TODO(jnetterf): why cast?
        let description = chrome && (descriptionField ?
                descriptionField.data :
                <p>No description.</p>);
        let title = chrome && <h3>Test {this.state.filename}&nbsp;&nbsp;{link}</h3>;
        return <div className={STYLES.test}>
            {title}
            {description}
            <br />
            <Viewer document={document} pageClassName={STYLES.page} />
        </div>;
    }

    componentDidMount() {
        this.componentDidUpdate(null, null);
    }

    componentWillMount() {
        this.setState({
            filename: this.props.filename
        });
    }

    componentWillReceiveProps(nextProps: Test.IProps) {
        if (this.props.filename !== nextProps.filename) {
            this.setState({
                filename: nextProps.filename,
                src: null,
                document: null
            });
        }
    }

    componentDidUpdate(prevProps: Test.IProps, prevState: Test.IState) {
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
                            defer(() => {
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

module Test {
    export interface IProps {
        key?: string | number;
        chrome?: boolean;
        name: string;
        showFilterButton?: boolean;
        filename: string;
    }
    export interface IState {
        filename?: string;
        src?: string;
        document?: IDocument;
        error?: Error;
    }
}

export default Test;
