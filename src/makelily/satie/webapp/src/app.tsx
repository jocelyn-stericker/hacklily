import * as React from "react";
import {Component} from "react";
import {Link} from "react-router";

import {prefix} from "./config";
const STYLES = require("./app.css");

export interface IProps {
    children: any;
    params: {
        id: string;
    };
    location: {
        pathname: string;
    };
    header: any;
    description: any;
    main: any;
}

export default class App extends Component<IProps, void> {
    render() {
        let path = this.props.location.pathname;
        let topLink = path !== (prefix + "/") && path !== prefix &&
            <Link className={STYLES.toplink} to={`${prefix}/`}>« Go home</Link>;
        return <div>
            <header>
                <div className={STYLES.topbar} />
                {topLink}
                <h1>{this.props.header}</h1>
                <aside>
                    {this.props.description}
                </aside>
            </header>
            {this.props.main}
        </div>;
    }
}
