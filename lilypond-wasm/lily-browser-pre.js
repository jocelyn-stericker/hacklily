// pre-js for the lilypond.wasm browser build (MEMFS; the node build uses
// NODERAWFS and needs none of this).  The staging tree is preloaded at
// /lilypond (see bootstrap.sh / webtest-lily); env vars point LilyPond,
// Guile and fontconfig into it.
Module.preRun = Module.preRun || [];
Module.preRun.push(() => {
  ENV.GUILE_AUTO_COMPILE = "0";
  ENV.GUILE_LOAD_COMPILED_PATH = "/lilypond/guile-ccache";
  ENV.LILYPOND_DATADIR = "/lilypond/share/lilypond/2.27.1";
  ENV.LILYPOND_LIBDIR = "/lilypond/lib/lilypond/2.27.1";
  ENV.FONTCONFIG_FILE = "/lilypond/fonts.conf";
});
Module.onRuntimeInitialized = () => {
  // The file packager doesn't preserve mtimes, so preloaded .go bytecode can
  // look staler than its .scm source and Guile silently falls back to the
  // source interpreter (load.c compiled_is_fresh).  Bump ccache mtimes.
  const future = Date.now() + 864e5;
  const walk = (dir) => {
    for (const name of FS.readdir(dir)) {
      if (name === "." || name === "..") continue;
      const p = dir + "/" + name;
      if (FS.isDir(FS.stat(p).mode)) walk(p);
      else FS.utime(p, future, future);
    }
  };
  walk("/lilypond/guile-ccache");
  walk("/lilypond/lib/lilypond/2.27.1/ccache");
  FS.mkdir("/fccache"); // fontconfig <cachedir>
};
