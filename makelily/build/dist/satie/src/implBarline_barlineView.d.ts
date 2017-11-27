/// <reference types="react" />
import { Component, ReactElement } from "react";
import BarlineModel from "./implBarline_barlineModel";
/**
 * Renders a full-stave-height barline at (x,y).
 * Does not do any interesting calculations.
 */
export default class BarlineView extends Component<{
    layout: BarlineModel.IBarlineLayout;
}, {}> {
    static contextTypes: any;
    context: {
        originY: number;
        systemBottom: number;
        systemTop: number;
    };
    render(): ReactElement<any>;
}
