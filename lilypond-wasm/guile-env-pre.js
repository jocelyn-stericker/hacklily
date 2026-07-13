// Emscripten's file packager doesn't preserve mtimes, so preloaded .go
// files can look older than their .scm sources and Guile skips them
// (load.c compiled_is_fresh). Bump ccache mtimes into the future.
Module.preRun = Module.preRun || [];
Module.preRun.push(() => { ENV.GUILE_AUTO_COMPILE = '0'; });
Module.onRuntimeInitialized = () => {
  const future = Date.now() + 864e5;
  const walk = (dir) => {
    for (const name of FS.readdir(dir)) {
      if (name === '.' || name === '..') continue;
      const p = dir + '/' + name;
      if (FS.isDir(FS.stat(p).mode)) walk(p);
      else FS.utime(p, future, future);
    }
  };
  walk('/home/ubuntu/workspaces/guile-wasm/wasm-install/lib/guile/3.0/ccache');
};
