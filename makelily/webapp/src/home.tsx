import * as React from "react";
import {Component} from "react";
import {Link} from "react-router";

import Test from "./test";
import {prefix} from "./config";

class Home extends Component<void, void> {
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
    export class Header extends Component<void, void> {
        render() {
            return <span>Satie is a sheet music toolkit.</span>;
        }
    }
    export class Description extends Component<void, void> {
        render() {
            return <span>
                Satie is designed to help JavaScript developers create interactive
                sheet music applications.{" "}
                <a href="https://github.com/jnetterf/satie/">
                Learn more at GitHub »</a>
            </span>;
        }
    }
}

export default Home;
