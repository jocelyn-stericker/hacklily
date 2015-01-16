declare module 'fast-json-patch' {
    export var intervals: any;
    export function unobserve(root: any, observer: any): void;
    export function observe(obj: any, callback: any): any;
    export function generate(observer: any): any;
    export function apply(tree: any, patches: any[], validate?: boolean): boolean;
    export function compare(tree1: any, tree2: any): any[];
    export class OriginalError {
        name: string;
        message: string;
        stack: string;
        constructor(message?: string);
    }
    export class JsonPatchError extends OriginalError {
        message: string;
        name: string;
        index: number;
        operation: any;
        tree: any;
        constructor(message: string, name: string, index?: number, operation?: any, tree?: any);
    }
    /**
     * Validates a single operation. Called from `jsonpatch.validate`. Throws `JsonPatchError` in case of an error.
     * @param {object} operation - operation object (patch)
     * @param {number} index - index of operation in the sequence
     * @param {object} [tree] - object where the operation is supposed to be applied
     * @param {string} [existingPathFragment] - comes along with `tree`
     */
    export function validator(operation: any, index: number, tree?: any, existingPathFragment?: string): void;
    /**
     * Validates a sequence of operations. If `tree` parameter is provided, the sequence is additionally validated against the object tree.
     * If error is encountered, returns a JsonPatchError object
     * @param sequence
     * @param tree
     * @returns {JsonPatchError|undefined}
     */
    export function validate(sequence: any[], tree?: any): JsonPatchError;
}
