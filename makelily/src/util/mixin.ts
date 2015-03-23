/**
 * Based on code from https://typescript.codeplex.com/wikipage?title=Mixins%20in%20TypeScript
 * Public Domain.
 */
function mixin(derivedCtor: any, ...baseCtors: any[]) {
    baseCtors.forEach(baseCtor => {
        Object.getOwnPropertyNames(baseCtor.prototype).forEach(name => {
            derivedCtor.prototype[name] = baseCtor.prototype[name];
        })
    }); 
}

export = mixin;
