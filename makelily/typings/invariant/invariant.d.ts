interface InvariantFn {
        (condition: boolean, format?: string, ...params: any[]): void;
}

declare var invariantFn: InvariantFn;

declare module "invariant" {
	export = invariantFn
}
