/**
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/jnetterf/satie>.
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import React = require("react");

interface IAnyComponent<P, S> extends React.Component<P, S>, React.ComponentLifecycle<P, S> {
    // standard React fields
    props: P;
    state: S;
    context: any;
    refs: {
        [key: string]: React.Component<any, any>
    };

    // standard React methods
    setState(f: (prevState: S, props: P) => S, callback?: () => any): void;
    setState(state: S, callback?: () => any): void;
    forceUpdate(): void;
    componentWillMount?(): void;
    componentDidMount?(): void;
    componentWillReceiveProps?(nextProps: P, nextContext: any): void;
    shouldComponentUpdate?(nextProps: P, nextState: S, nextContext: any): boolean;
    componentWillUpdate?(nextProps: P, nextState: S, nextContext: any): void;
    componentDidUpdate?(prevProps: P, prevState: S, prevContext: any): void;
    componentWillUnmount?(): void;
    render?(): void;

    getChildContext?(): void;
}

export default IAnyComponent;
