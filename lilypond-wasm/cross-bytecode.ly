\version "2.27.1"

% Cross-compile LilyPond's Scheme to .go bytecode for a foreign target.
%
% LilyPond's own `make bytecode` runs the lilypond binary with
% GUILE_AUTO_COMPILE=1 over scm/compile.ly and harvests the fallback ccache.
% That only works for the host: auto-compile *loads* each .go right after
% writing it, and a wasm32 .go cannot be loaded by a native Guile.  So this
% driver replicates the flow in two phases: load every module compile.ly
% loads (natively, from source or native bytecode), then explicitly
% compile-file each file with the compiler's target fluids pointed at the
% cross target, never loading the output.
%
% Run with the *native* lilypond binary:
%   CROSS_SCM_DIR=$PREFIX/share/lilypond/2.27.1/scm/lily \
%   CROSS_GO_DIR=$PREFIX/lib/lilypond/2.27.1/ccache/lily \
%   CROSS_TARGET=wasm32-unknown-emscripten \
%   GUILE_AUTO_COMPILE=0 lilypond cross-bytecode.ly

% Same module list as scm/compile.ly: pulls in (lily) and everything the
% backends reach transitively.
#(use-modules
  (lily accreg)
  (lily framework-cairo)
  (lily framework-ps)
  (lily framework-svg)
  (lily graphviz)
  (lily output-ps)
  (lily output-svg)
  (lily page)
  (lily to-xml))

#(use-modules (system base target)
              (system base compile))

#(let* ((scm-dir (or (getenv "CROSS_SCM_DIR")
                     (error "CROSS_SCM_DIR not set")))
        (go-dir (or (getenv "CROSS_GO_DIR")
                    (error "CROSS_GO_DIR not set")))
        (target (or (getenv "CROSS_TARGET") "wasm32-unknown-emscripten"))
        (lily-mod (resolve-module '(lily)))
        (init-files (module-ref lily-mod 'init-scheme-files))
        (count 0))
   (define (compile-one name env)
     (let ((src (string-append scm-dir "/" name ".scm"))
           (out (string-append go-dir "/" name ".go")))
       (if (file-exists? src)
           (begin
             (with-target target
               (lambda ()
                 (compile-file src
                               #:output-file out
                               #:env env
                               #:opts %auto-compilation-options)))
             (set! count (1+ count)))
           (ly:warning "cross-bytecode: no source for ~a" name))))
   (system* "mkdir" "-p" go-dir)
   ;; lily.scm itself (starts with define-module, env is just the seed) ...
   (compile-one "lily" lily-mod)
   ;; ... the files ly:load splices into the (lily) module ...
   (for-each (lambda (n) (compile-one n lily-mod)) init-files)
   ;; ... and every loaded (lily FOO) submodule, incl. transitive ones.
   (hash-for-each
    (lambda (name mod)
      (compile-one (symbol->string name) mod))
    (module-submodules lily-mod))
   ;; One file is ly:load'ed into a submodule rather than into (lily):
   ;; display-lily.scm splices define-music-display-methods.scm into
   ;; (lily display-lily).  (Cross-check: the output must match the .go
   ;; set `make bytecode` produces in a native build.)
   (compile-one "define-music-display-methods"
                (resolve-module '(lily display-lily)))
   (format (current-error-port)
           "cross-bytecode: compiled ~a files for ~a into ~a\n"
           count target go-dir))
