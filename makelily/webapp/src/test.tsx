import * as React from "react";
import {Component} from "react";
import {Link} from "react-router";
import {ISong, Application} from "../../src/index";
import {find, defer} from "lodash";

import {prefix} from "./config";
const STYLES = require("./test.css");

export let satieApplication = new Application({
    satieRoot: location.protocol + "//" + location.host + prefix + "/vendor/",
    preloadedFonts: ["Alegreya", "Alegreya (bold)"]
});

export interface IProps {
    key?: string | number;
    chrome?: boolean;
    name: string;
    showFilterButton?: boolean;
    filename: string;
    singleLine: boolean;
}

export interface IState {
    filename?: string;
    src?: string;
    song?: ISong;
    error?: Error;
}

export default class Test extends Component<IProps, IState> {
    state: IState = {
        filename: null,
        src: null,
        song: null
    };

    render() {
        const isSingleLine = this.props.singleLine;
        let chrome = this.props.chrome !== false;
        let showFilterButton = chrome && this.props.showFilterButton;
        let link = showFilterButton ?
            <Link to={`${prefix}/tests/${this.props.name}/?mode=${isSingleLine ? "singleline" : "page"}`}>
                    <button>hide others</button></Link> : null;
        if (this.state.error) {
            let errStr = "" + (this.state.error as any).stack.toString();
            let lines = errStr.split("\n").map((s, idx) => <div key={idx}>{s}</div>);
            return <div className={STYLES.test}>
                <h3>Test {this.state.filename}&nbsp;&nbsp;{link}</h3>
                <code className={STYLES.error}>
                    {lines}
                </code>
            </div>;
        }

        const {song} = this.state;
        if (!song) {
            return <div>
                Loading...
            </div>;
        }

        let misc = chrome && song.getDocument().header.identification.miscellaneous;
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
            {this.state.song.toReactElement()}
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

    componentWillReceiveProps(nextProps: IProps) {
        if (this.props.filename !== nextProps.filename) {
            this.setState({
                filename: nextProps.filename,
                src: null,
                song: null
            });
        }
    }

    componentDidUpdate(prevProps: IProps, prevState: IState) {
        let prefix = process.env.PLAYGROUND_PREFIX || "";
        if (!this.state.src || (prevProps.singleLine !== this.props.singleLine)) {
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
                this.setState({
                    src: request.responseText,
                    song: satieApplication.newSong({
                        errorHandler: (err) => {
                            console.warn(err);
                            defer(() => {
                                this.setState({
                                    error: err,
                                    src: request.responseText
                                });
                            });
                        },
                        changeHandler: () => {
                            this.forceUpdate();
                        },
                        mouseMoveHandler: () => void 0,
                        mouseClickHandler: () => void 0,
                        musicXML: request.responseText,
                        pageClassName: !this.props.singleLine && STYLES.page,
                        singleLineMode: this.props.singleLine,
                    }),
                });
            };
            request.send();
        }
    }
}

