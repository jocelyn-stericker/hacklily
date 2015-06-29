import React = require("react");
import {Link, RouteHandler, RouterContext} from "react-router";

const STYLES = require("./app.less");

let prefix = process.env.PLAYGROUND_PREFIX || "";

class App extends React.Component<{params: {id: string}}, void> {
    render() {
        let router: RouterContext = this.context.router;
        let Handler: any = router.getCurrentRoutes()[this.context.routeDepth].handler;
        let topLink = router.getCurrentPath() !== (prefix + "/") &&
            React.jsx(`<Link className=${STYLES.toplink} to="home">« Go home</Link>`);
        let params = this.props.params;
        return React.jsx(`<div>
            <header>
                <div className=${STYLES.topbar} />
                ${topLink}
                <h1>Satie &ndash; <Handler.Header params=${params}/></h1>
                <aside>
                    <Handler.Description params=${params}/>
                </aside>
            </header>
            <RouteHandler />
        </div>`);
    }
}

module App {
    export let contextTypes = {
        routeDepth: React.PropTypes.number,
        router: React.PropTypes.func
    };
}

export default App;
