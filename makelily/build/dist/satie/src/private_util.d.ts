/**
 * Finds the positive greatest common factor of two numbers by using Euclid's algorithm.
 */
export declare function gcd(a: number, b: number): number;
/**
 * Calculates modified lcm. This functions handles zero and negatives.
 */
export declare function lcm(a: number, b: number): number;
/**
 * Very efficient way of cloning a plain JavaScript object (i.e., one without prototypes, getters, or setters)
 */
export declare function cloneObject<T>(obj: T): T;
export declare const MAX_SAFE_INTEGER = 9007199254740991;
