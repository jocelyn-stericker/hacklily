/// <reference types="react" />
import React = require('react');
/**
 * Properties derived from URL.
 *
 * e.g., https://www.hacklily.org/makelily?clef=blah =>
 *   {
 *     clef: "blah",
 *   }
 *
 * NOTE: When you add a key here, also add it to QUERY_PROP_KEYS below.
 */
export interface QueryProps {
    clef?: string;
    defaultTool?: string;
    keySig?: string;
    singleTaskMode?: boolean;
    time?: string;
}
export declare const QUERY_PROP_KEYS: (keyof QueryProps)[];
export interface Props extends QueryProps {
    /**
     * Updates a field in the URL query.
     */
    setQuery<K extends keyof QueryProps>(updates: Pick<QueryProps, K>, replaceState?: boolean): void;
}
/**
 * This renders a SPA which demos the makelily modal.
 */
export default class App extends React.Component<Props, {}> {
    render(): JSX.Element;
    private handleInsertLy(ly);
}
