import React = require("react");
import {Route, Link} from "react-router";
import _ = require("lodash");

import Test from "./test";

import {prefix} from "./config";
const STYLES = require("./tests.css");

const TEST_CATEGORIES: {[key: string]: string} = {
    "01": "Pitches",
    "02": "Rests",
    "03": "Rhythm",
    "11": "Time signatures",
    "12": "Clefs",
    "13": "Key signatures",
    "14": "Staff attributes",
    "21": "Chorded notes",
    "22": "Note settings, heads, etc.",
    "23": "Triplets, Tuplets",
    "24": "Grace notes",
    "31": "Dynamics and other single symbols",
    "32": "Notations and Articulations",
    "33": "Spanners",
    "41": "Multiple parts (staves)",
    "42": "Multiple voices per staff",
    "43": "One part on multiple staves",
    "45": "Repeats",
    "46": "Barlines, Measures",
    "51": "Header information",
    "52": "Page layout",
    "61": "Lyrics",
    "71": "Guitar notation",
    "72": "Transposing instruments",
    "73": "Percussion",
    "74": "Figured bass",
    "75": "Other instrumental notation",
    "90": "Compressed MusicXML files",
    "99": "Compatibility with broken MusicXML",
};

const TESTS = [
    "01a",
    "01b",
    "01c",
    "01d",
    "01e",
    "01f",
    "02a",
    "02b",
    "02c",
    "02d",
    "02e",
    "03a",
    "03b",
    "03c",
    "03d",
    "11a",
    "11b",
    "11c",
    "11d",
    "11e",
    "11f",
    "11g",
    "11h",
    "12a",
    "12b",
    "13a",
    "13b",
    "13c",
    "13d",
    "14a",
    "21a",
    "21b",
    "21c",
    "21d",
    "21e",
    "21f",
    "22a",
    "22b",
    "22c",
    "22d",
    "23a",
    "23b",
    "23c",
    "23d",
    "23e",
    "23f",
    "24a",
    "24b",
    "24c",
    "24d",
    "24e",
    "24f",
    "31a",
    "31c",
    "32a",
    "32b",
    "32c",
    "32d",
    "33a",
    "33b",
    "33c",
    "33d",
    "33e",
    "33f",
    "33g",
    "33h",
    "33i",
    "41a",
    "41b",
    "41c",
    "41d",
    "41e",
    "41f",
    "41g",
    "41h",
    "41i",
    "42a",
    "42b",
    "43a",
    "43b",
    "43c",
    "43d",
    "43e",
    "45a",
    "45b",
    "45c",
    "45d",
    "45e",
    "45f",
    "45g",
    "46a",
    "46b",
    "46c",
    "46d",
    "46e",
    "46f",
    "46g",
    "51b",
    "51c",
    "51d",
    "52a",
    "52b",
    "61a",
    "61b",
    "61c",
    "61d",
    "61e",
    "61f",
    "61g",
    "61h",
    "61i",
    "61j",
    "61k",
    "71a",
    "71c",
    "71d",
    "71e",
    "71f",
    "71g",
    "72a",
    "72b",
    "72c",
    "73a",
    "75a",
    "90a",
    "99a",
    "99b"
];
class Tests extends React.Component<{params: {id: string}}, void> {
    render() {
        let filter = this.props.params ? this.props.params.id : null;
        let cat = _.reduce(TESTS, (memo, testName) => {
            let type = testName.substr(0, 2);
            let link = filter ?
                null :
                <Link to={`${prefix}/tests/${type}`}>
                        <button>hide others</button></Link>;
            if (type !== memo.type && (!filter || type.indexOf(filter) === 0)) {
                memo.acc.push(<h2 key={type}>
                            {TEST_CATEGORIES[type]}&nbsp;&nbsp;{link}</h2>);
            }
            if (!filter || testName.indexOf(filter) === 0) {
                memo.acc.push(
                        <Test showFilterButton={testName !== filter} name={testName}
                    key={testName} filename={"/lilypond-regression/" + testName + ".xml"} />);
            }
            return {
                acc: memo.acc,
                type: type
            };
        }, {acc: [] as any[], type: ""}).acc;
        return <div className={STYLES.tests}>
            {cat}
        </div>;
    }
}

module Tests {
    export class Header extends React.Component<{params: {id: string}}, void> {
        render() {
            return <span>LilyPond Test Suite</span>;
        }
    }
    export class Description extends React.Component<{params: {id: string}}, void> {
        render() {
            let filter = this.props.params ? this.props.params.id : null;
            if (filter) {
                let link = filter.length > 1 ? `${prefix}/tests/${filter.substr(0, filter.length - 1)}` : "/tests";

                return <span>
                    <code>Filter: {`"${filter}`}</code>&nbsp;&nbsp;
                    <Link to={link}>
                        <button>
                            {filter.length > 1 ? "show more" : "show all"}
                        </button>
                    </Link>
                </span>;
            }
            let lilypond = "http://www.lilypond.org/doc/v2.18/input/" +
                "regression/musicxml/collated-files.html";
            return <span>
                Satie uses the <a href={lilypond}>unoffical MusicXML test suite</a>{" "}
                from <a href="http://lilypond.org/">LilyPond</a>{" "}
                to test MusicXML parsing
                as well as basic layout.
            </span>;
        }
    }
}

export default Tests;
