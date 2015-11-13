declare module 'invariant' {
    function invariant(condition: boolean, format: string, ...params: any[]): void;
    export = invariant;
}
