// Hand-written types for the emscripten glue (espeak-phonemes.js), which is a
// generated MODULARIZE/EXPORT_ES6 artifact and ships without its own .d.ts.
// The default export is the Module factory: call it (optionally with overrides
// like `locateFile`/`wasmBinary`) and await the instantiated Module. Pass the
// result as `moduleFactory` to `createESpeak`.
declare const initEspeakPhonemes: (moduleOverrides?: any) => Promise<any>
export default initEspeakPhonemes
