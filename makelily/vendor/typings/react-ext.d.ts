declare module 'react/lib/ReactDefaultPerf' {
    export function start(): void;
    export function stop(): void;
    export function printInclusive(): void;
    export function printExclusive(): void;
    export function printWasted(): void;
    export function printDOM(): void;
}
