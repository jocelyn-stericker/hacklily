import React = require("react");
import {Link} from "react-router";

import Test from "./test";
import {prefix} from "./config";

class Home extends React.Component<void, void> {
    render() {
        return <div>
            <p>
            Satie is created by <a href="https://nettek.ca">Josh Netterfield</a> and is a
            component of <a href="https://ripieno.io">Ripieno</a>, a collaborative sheet
            music editor. Satie isn't ready for production use, yet.
            </p>
            <Test chrome={false} name="01a" filename={"/lilypond-regression/01a.xml"} />
            <Link to={`${prefix}/tests`}><button>Run test suite »</button></Link>
        </div>;
    }
}

module Home {
    export class Header {
        render() {
            return <span>exquisite sheet music for the web</span>;
        }
    }
    export class Description {
        render() {
            return <span>
                You can use Satie to embed sheet music on a page, render sheet music
                on a server, or create open-source sheet music
                applications. <a href="https://github.com/jnetterf/satie/">
                Learn more at GitHub »</a>
            </span>;
        }
    }
}

export default Home;
