import React = require("react");
import {Link} from "react-router";

import {prefix} from "./config";
const STYLES = require("./app.css");

class App extends React.Component<{children: any, params: {id: string}, route: {path: string}, header: any, description: any, main: any}, void> {
    render() {
        let topLink = this.props.route.path !== (prefix + "/") &&
            <Link className={STYLES.toplink} to={`${prefix}/`}>« Go home</Link>;
        let params = this.props.params;
        return <div>
            <header>
                <div className={STYLES.topbar} />
                {topLink}
                <h1>Satie &ndash; {this.props.header}</h1>
                <aside>
                    {this.props.description}
                </aside>
            </header>
            {this.props.main}
        </div>;
    }
}

module App {
}

export default App;
