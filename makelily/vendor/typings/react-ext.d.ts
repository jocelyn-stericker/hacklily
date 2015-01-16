declare module 'react/lib/invariant' {
    function invariant(condition: boolean, format: string, ...params: any[]): void;
    export = invariant;
}

declare module 'react/lib/ReactComponentWithPureRenderMixin' {
    import React = require("react");
    var ReactComponentWithPureRenderMixin: React.Mixin<{}, {}>;
    export = ReactComponentWithPureRenderMixin;
}
