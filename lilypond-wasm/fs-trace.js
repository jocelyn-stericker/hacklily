// Preload with NODE_OPTIONS=--require to log every file successfully
// opened through node's fs (NODERAWFS routes libc IO here).
const fs = require('fs');
const opened = new Set();
const statted = new Set();
function wrap(name, set) {
  const orig = fs[name];
  fs[name] = function (p, ...rest) {
    const r = orig.call(this, p, ...rest);
    if (typeof p === 'string') set.add(p);
    return r;
  };
}
wrap('openSync', opened);
wrap('readFileSync', opened);
wrap('statSync', statted);
wrap('lstatSync', statted);
process.on('exit', () => {
  fs.writeFileSync(process.env.FS_TRACE_OUT,
    [...opened].sort().map(p => 'OPEN ' + p)
      .concat([...statted].sort().map(p => 'STAT ' + p))
      .join('\n') + '\n');
});
