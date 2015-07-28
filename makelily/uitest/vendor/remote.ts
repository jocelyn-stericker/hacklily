import __remote = require("remote");
let remote: typeof __remote = (window as any).require("remote");

export default remote;
