import __remote = require("remote");
let rRequire = (window as any).require;
let remote: typeof __remote = rRequire && rRequire("remote");

export default remote;
