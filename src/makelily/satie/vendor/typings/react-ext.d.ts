declare module 'react/lib/ReactComponentWithPureRenderMixin' {
    import React = require("react");
    var ReactComponentWithPureRenderMixin: React.Mixin<{}, {}>;
    export = ReactComponentWithPureRenderMixin;
}

declare module 'react/lib/ReactDefaultPerf' {
    export function start(): void;
    export function stop(): void;
    export function printInclusive(): void;
    export function printExclusive(): void;
    export function printWasted(): void;
    export function printDOM(): void;
}

declare module __React {
    interface SVGAttributes extends DOMAttributes {
        className?: string;
        "font-weight"?: string;
        "alignment-baseline"?: string;
        width?: number
        height?: number;
        direction?: string;
        "font-style"?: string;
        "letter-spacing"?: string;
        "text-decoration"?: string;
    }
    interface SVGElementAttributes extends HTMLAttributes {
        // Ripieno EXT
        "data-page"?: string;
     }
}

