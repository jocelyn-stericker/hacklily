/**
 * The Ripieno editor. 
 * (C) Josh Netterfield <joshua@nettek.ca> 2014-2015.
 * 
 * This file has specs for the operations defined in the JSON0 OT Type spec.
 * https://github.com/ottypes/json0
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
 * associated documentation files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following condition:
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT
 * LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/**
 * A path to an element in a JSON document.
 */
export type OTPath = (number | string)[]; 

/**
 * Adds x to the number at path
 */
export interface IOTNumberAdd {
    /**
     * Path to a number.
     */
    p: OTPath;

    /**
     * The number to add to the number at `p`.
     */
    na: number;
}

/**
 * Inserts the object obj before the item at idx in the list at [path].
 */
export interface IOTListInsert<T> {
    /**
     * [...path, idx]
     */
    p: OTPath;

    /**
     * The object to insert before the item at idx `idx`.
     */
    li: T;
}

/**
 * Deletes the object obj from the index idx in the list at [path].
 */
export interface IOTListDelete<T> {
    /**
     * [...path, idx]
     */
    p: OTPath;

    /**
     * The object that will be removed at `idx`, for invertibility.
     */
    ld: T;	
}

/**
 * Replaces the object before at the index idx in the list at [path] with the object after.
 */
export interface IOTListReplace<T> {
    /**
     * [...path, idx]
     */
    p: OTPath;

    /**
     * The object that will be removed at `idx`, for invertibility.
     */
    ld: T;

    /**
     * The object that will be added to `idx`.
     */
    li: T;	
}

/**
 * Moves the object at idx1 such that the object will be at index idx2 in the list at [path].
 */
export interface IOTListMove {
    /**
     * [...path, idx]
     */
    p: OTPath;
    
    /**
     * The index to move the object to ("idx2")
     */
    lm: number;
}

/**
 * Inserts the object obj into the object at [path] with key key.
 */
export interface IOTObjectInsert<T> {
    /**
     * [...path, key: string]
     */
    p: OTPath;
    
    /**
     * The object to insert
     */
    oi: T;
}

/**
 * Deletes the object obj with key key from the object at [path].
 */
export interface IOTObjectDelete<T> {
    /**
     * [...path, key: string]
     */
    p: OTPath;
    
    /**
     * The object to delete, for invertibility
     */
    od: T;
}

/**
 * Replaces the object before with the object after at key key in the object at [path].
 */
export interface IOTObjectReplace<T> {
    /**
     * [...path, key: string]
     */
    p: OTPath;
    
    /**
     * The object to delete, for invertibility.
     */
    od: T;
    
    /**
     * The object to insert at key.
     */
    oi: T;
}

/**
 * Applies the subtype op o of type t to the object at [path].
 */
export interface IOTObjectApply {
    /**
     * [...path, key: string] to subtype
     */
    p: OTPath;
    
    /**
     * The subtype
     */
    t: any;
    
    /**
     * The operation.
     */
    o: any;
}

/**
 * Inserts the string s at offset offset into the string at [path] (uses subtypes internally).
 */
export interface IOTStringInsert {
    /**
     * Path to string
     */
    p: OTPath;
    
    si: string;	
}

export interface IOTStringDelete {
    /**
     * Path to string
     */
    p: OTPath;
    
    /**
     * The string being removed, for length and invertibility
     */
    sd: string;
}

export type Operation<T> = IOTNumberAdd |
    IOTListInsert<T> | IOTListDelete<T> | IOTListReplace<T> | IOTListMove |
    IOTObjectInsert<T> | IOTObjectDelete<T> | IOTObjectReplace<T> | IOTObjectApply |
    IOTStringInsert | IOTStringDelete;

export type AnyOperation = Operation<any>; 

let subtypes: any[] = [];

export function invertComponent<T>(cm: Operation<T>): Operation<T> {
    let c = cm as any;
    var c_ = {p: c.p} as any;
    
    // handle subtype ops
    if (c.t && subtypes[c.t]) {
        c_.t = c.t;
        c_.o = subtypes[c.t].invert(c.o);
    }
    
    if (c.si !== void 0) c_.sd = c.si;
    if (c.sd !== void 0) c_.si = c.sd;
    if (c.oi !== void 0) c_.od = c.oi;
    if (c.od !== void 0) c_.oi = c.od;
    if (c.li !== void 0) c_.ld = c.li;
    if (c.ld !== void 0) c_.li = c.ld;
    if (c.na !== void 0) c_.na = -c.na;
    
    if (c.lm !== void 0) {
        c_.lm = c.p[c.p.length - 1];
        c_.p = c.p.slice(0, c.p.length - 1).concat([c.lm]);
    }
    
    return c_;
}

export function invert<T>(ops: Operation<T>[]): Operation<T>[] {
    return ops.slice().reverse().map(c => invertComponent(c));
}