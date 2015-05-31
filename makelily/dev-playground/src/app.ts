import React = require("react");
import { Route, DefaultRoute, RouteHandler, Link, RouterContext } from "react-router";

var STYLES = require("./app.scss");

class App extends React.Component<{params: {id: string}}, void> {
    render() {
        let router: RouterContext = this.context.router;
        let Handler: any = router.getCurrentRoutes()[this.context.routeDepth].handler;
        let topLink = router.getCurrentPath() !== "/" && React.jsx(`<Link className=${STYLES.toplink} to='/'>« Go home</Link>`);
        let params = this.props.params;
        return React.jsx(`<body>
            <header>
                <div className=${STYLES.topbar} />
                ${topLink}
                <h1>Satie &ndash; <Handler.Header params=${params}/></h1>
                <aside>
                    <Handler.Description params=${params}/>
                </aside>
            </header>
            <RouteHandler />
        </body>`);
    }   
}

module App {
    export var contextTypes = {
        routeDepth: React.PropTypes.number,
        router: React.PropTypes.func
    };
}

export = App;