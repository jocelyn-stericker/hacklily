;; LilyPond TCP render server.
;;
;; Replaces the unmaintained lyp-packages/lys library. Runs inside a
;; warm LilyPond process so repeat compiles skip LilyPond's startup
;; cost. Listens on a TCP port; for each accepted connection a worker
;; is double-forked so a crash (or a malicious `killall lilypond`)
;; only takes down the worker, never the master.
;;
;; Wire protocol: one Scheme s-expression per request, terminated by a
;; newline. The server reads, evaluates, writes the LilyPond log to
;; the socket (stdout/stderr are redirected to the client), then
;; emits a `\n> ` prompt and waits for the next expression. The
;; companion `render-impl.bash` drives this over /dev/tcp and is
;; responsible for packaging the produced output files as JSON.
;;
;; Public entry points:
;;   (hacklily:start-server)         - listen on hacklily:default-port
;;   (hacklily:start-server PORT)    - listen on PORT
;;   (hacklily:compile-file DIR . opts)
;;       - chdir to DIR, apply opts, run ly:parse-file on the trailing
;;         filename argument. opts follow LilyPond's long-option form
;;         ("--svg", "--pdf", "--png", "--output=foo", "-dbackend=svg",
;;         ...). This mirrors the lys:compile-file calling convention
;;         so render-impl.bash can stay close to the old shape.
;;   (hacklily:close)                - half-close the current socket

(use-modules (ice-9 rdelim)
             (ice-9 getopt-long)
             (ice-9 regex))

(define hacklily:default-port 1225) ; "ly" in numbers, kept for back-compat

;; A port that always points at the master's real stderr, so debug
;; lines survive after we redirect stdout/stderr onto the client.
(define hacklily:log-port (dup (current-error-port)))

(define (hacklily:debug msg)
  (display
    (format #f "~a (~a): ~a\n"
            (strftime "%Y-%m-%d %H:%M:%S" (localtime (current-time)))
            (getpid) msg)
    hacklily:log-port)
  (force-output hacklily:log-port))

;;---------------------------------------------------------------------
;; Forking
;;---------------------------------------------------------------------

;; Double fork: parent forks a child that immediately exits (and is
;; reaped by the parent via waitpid), the child forks a grandchild
;; that runs proc. The grandchild is reparented to init, so it never
;; produces a zombie for the master to collect, and if it dies (e.g.
;; danger_kill_lilypond.ly kills all lilypond processes) the master
;; keeps running.
(define (hacklily:fork-worker proc)
  (let ((child-pid (primitive-fork)))
    (if (zero? child-pid)
        (let ((grandchild-pid (primitive-fork)))
          (if (zero? grandchild-pid)
              (proc)
              (primitive-exit)))
        (waitpid child-pid))))

;;---------------------------------------------------------------------
;; Eval loop
;;---------------------------------------------------------------------

;; Safe eval: catch all throws so a bad expression logs instead of
;; killing the worker.
(define (hacklily:eval expr)
  (catch #t
    (lambda () (eval expr (current-module)))
    (lambda (key . params)
      (hacklily:debug
        (format #f "Error evaluating expression ~a: ~a" key params)))))

;; Evaluate a single request from the port, then return. The caller
;; (client-handler) then closes the connection via primitive-exit,
;; which gives the client an EOF — the unfakeable framing signal.
(define (hacklily:eval-one port)
  (let ((expr (read port)))
    (if (not (eof-object? expr))
        (begin
          (hacklily:debug (format #f "eval ~s" expr))
          (hacklily:eval expr)
          (force-output port)))))

;;---------------------------------------------------------------------
;; Compile entry point
;;---------------------------------------------------------------------

;; getopt-long spec for the options we expose. LilyPond's `-d` flags
;; are translated to `--d<name>` so getopt-long accepts them, matching
;; the lys convention.
(define hacklily:advanced-options
  '((anti-alias-factor . eval)            (aux-files . eval)
    (backend . string->symbol)            (check-internal-types . eval)
    (clip-systems . eval)                 (delete-intermediate-files . eval)
    (embed-source-code . eval)            (eps-box-padding . eval)
    (gs-load-fonts . eval)                (gs-load-lily-fonts . eval)
    (gui . eval)                          (include-book-title-preview . eval)
    (include-eps-fonts . eval)             (include-settings . eval)
    (job-count . eval)                     (log-file . eval)
    (max-markup-depth . eval)              (midi-extension . identity)
    (music-strings-to-paths . eval)       (paper-size . identity)
    (pixmap-format . string->symbol)      (point-and-click . eval)
    (preview . eval)                      (print-pages . eval)
    (profile-property-accesses . eval)    (protected-scheme-parsing . eval)
    (read-file-list . identity)           (relative-includes . eval)
    (resolution . eval)                    (separate-log-files . eval)
    (show-available-fonts . eval)         (strict-infinity-checking . eval)
    (strip-output-dir . eval)             (strokeadjust . eval)
    (svg-woff . eval)                      (warning-as-error . eval)))

;; getopt-long matches the option name against argv with the leading
;; "--" already stripped, so a "-dbackend" flag (translated below to
;; "--dbackend") must be registered under the bare name "dbackend" --
;; NOT "--dbackend", which would only ever match "----dbackend".
(define hacklily:advanced-options-spec
  (map (lambda (o)
         (list (string->symbol
                 (string-append "d" (symbol->string (car o))))
               '(value #t)))
       hacklily:advanced-options))

;; Apply an advanced option's value translator. The alist stores the
;; translator as a symbol: 'eval means "the value is a Scheme
;; expression, read and evaluate it" (a bare (eval STRING) would just
;; return the self-evaluating string); 'string->symbol / 'identity act
;; on the raw string.
(define (hacklily:apply-translator translator-sym v)
  (cond
    ((eq? translator-sym 'eval)
     (eval (with-input-from-string v read) (current-module)))
    ((eq? translator-sym 'string->symbol) (string->symbol v))
    (else v)))

;; Generate a `hacklily:opt:d<name>` procedure for each advanced
;; option that sets the corresponding LilyPond -d option, translating
;; the string value first. getopt-long parses "--dbackend=svg" to the
;; key `dbackend`, so the dispatch in hacklily:set-compile-options
;; finds `hacklily:opt:dbackend` here.
(for-each
  (lambda (o)
    (let ((opt-name (car o))
          (translator-sym (cdr o)))
      (module-define! (current-module)
        (string->symbol (string-append "hacklily:opt:d" (symbol->string opt-name)))
        (lambda (v)
          (ly:set-option opt-name (hacklily:apply-translator translator-sym v))))))
  hacklily:advanced-options)

(define hacklily:standard-options-spec
  '((bigpdfs        (single-char #\b) (value #f))
    (evaluate       (single-char #\e) (value #t))
    (format         (single-char #\f) (value #t))
    (include        (single-char #\I) (value #t))
    (loglevel       (single-char #\l) (value #t))
    (output         (single-char #\o) (value #t))
    (pdf                              (value #f))
    (png                              (value #f))
    (ps                               (value #f))
    (svg                              (value #f))
    (persist                          (value #f))))

(define hacklily:compile-options-spec
  (append hacklily:standard-options-spec hacklily:advanced-options-spec))

;; Translate "-dfoo=bar" into "--dfoo=bar" and prepend a dummy argv[0]
;; so getopt-long is happy. `--svg/--pdf/--png/--ps` are turned into
;; `ly:set-option 'backend` settings (the modern equivalent of lys's
;; ly:output-formats rebinding); the file extension LilyPond writes
;; follows the backend.
(define (hacklily:translate-compile-options opts)
  (append
    (list "lilypond")
    (map (lambda (o)
           (let ((m (string-match "^-d([^=]+)=(.+)" o)))
             (if m
                 (regexp-substitute #f m "--d" 1 "=" 2)
                 o)))
         opts)))

;; Select the output backend. The output *format* list is fixed at
;; lilypond startup (we launch with --pdf --svg); the backend option
;; picks which framework module renders the pages. The per-backend
;; opt functions below set this directly.

(define (hacklily:set-compile-options opts)
  (for-each
    (lambda (o)
      (let* ((key (symbol->string (car o)))
             (value (cdr o))
             (fn-name (string-append "hacklily:opt:" key))
             ;; Not every parsed option has a handler (e.g. loglevel).
             ;; eval-string THROWS on an unbound name rather than
             ;; returning #f, so guard with false-if-exception and a
             ;; procedure? check instead of relying on a falsy return.
             (fn (false-if-exception (eval-string fn-name))))
        (when (procedure? fn) (fn value))))
    opts))

(define (hacklily:opt:bigpdfs v) (ly:set-option 'bigpdfs (eq? v #t)))
(define (hacklily:opt:evaluate v) (eval-string v))
(define (hacklily:opt:format v) (ly:set-option 'backend (string->symbol v)))
;; PDF is produced by the PS backend (which writes both .ps and .pdf
;; via ghostscript), so select the ps backend for --pdf.
(define (hacklily:opt:pdf v) (ly:set-option 'backend 'ps))
(define (hacklily:opt:png v) (ly:set-option 'backend 'cairo))
(define (hacklily:opt:ps v) (ly:set-option 'backend 'ps))
(define (hacklily:opt:svg v) (ly:set-option 'backend 'svg))
(define (hacklily:opt:output v) (set! (paper-variable #f 'output-filename) v))
(define (hacklily:opt:persist v) #f)
(define (hacklily:opt:include v)
  ;; -I adds to LilyPond's include search path.
  (ly:set-option 'include (append (or (ly:get-option 'include) '()) (list v))))

;; Main entry: chdir to the client's working directory, apply opts,
;; parse the trailing file argument.  The heavy `ly:parse-init' runs
;; once in the master at startup (see hacklily:start-server); each
;; worker is forked from the master's clean post-init state, so user
;; definitions live in the worker's copy-on-write memory and are
;; discarded when the worker exits.  No session-terminate or option
;; save/restore is needed — fork gives us that isolation for free.
(define (hacklily:compile-file dir . opts)
  (let* ((opts (hacklily:translate-compile-options opts))
         (opts (getopt-long opts hacklily:compile-options-spec))
         (files (car opts))
         (compile-opts (cdr opts)))
    (chdir dir)
    (hacklily:set-compile-options compile-opts)
    (for-each
      (lambda (file)
        (unless (eq? file '())
          (ly:reset-all-fonts)
          ;; The warm server is launched with --pdf --svg, so the C++
          ;; output_formats_global list is ("pdf" "svg") and is never
          ;; cleared between requests. Each backend's framework-*.scm
          ;; warns about the formats it can't produce:
          ;;   svg backend -> "ignoring unsupported formats (pdf)"
          ;;   ps  backend -> "PS backend does not support SVG format"
          ;; Both are benign (each backend only writes its own format
          ;; regardless of the list), so suppress them as expected
          ;; warnings for the backend we've selected.
          (let ((backend (ly:get-option 'backend)))
            (cond
              ((eq? backend 'svg)
               (ly:expect-warning
                 (G_ "ignoring unsupported formats ~a") '("pdf")))
              ((eq? backend 'ps)
               (ly:expect-warning
                 (G_ "PS backend does not support SVG format")))))
          (lilypond-file (lambda (key failed-file) #f) file)
          (ly:check-expected-warnings)
          (ly:reset-all-fonts)
          (flush-all-ports)))
      files)))

;; Per-file driver mirroring lily.scm's `lilypond-file': catch
;; `ly-file-failed throws from ly:parse-file and hand them to the
;; supplied handler.
(define (lilypond-file handler file-name)
  (catch 'ly-file-failed
         (lambda () (ly:parse-file file-name))
         (lambda (x . args) (handler x file-name))))

;;---------------------------------------------------------------------
;; Server
;;---------------------------------------------------------------------

(define hacklily:socket #f)

(define (hacklily:open-listening-socket port)
  (let ((s (socket PF_INET SOCK_STREAM 0)))
    (setsockopt s SOL_SOCKET SO_REUSEADDR 1)
    (bind s AF_INET INADDR_ANY port)
    (listen s 5)
    s))

(define (hacklily:client-handler socket)
  (hacklily:debug "start client handler")
  (set! hacklily:socket socket)

  ;; Redirect LilyPond's C-level stderr (fd 2) onto the socket so all
  ;; log output (Processing, Parsing, message, warning, etc., which
  ;; bypass Guile ports and write directly to fd 2) reaches the client.
  ;; Also redirect Guile's current-output/error ports for any Scheme
  ;; code that uses them. Keep a private dup of the original stderr
  ;; for our debug lines.
  (let ((sock-fd (port->fdes socket)))
    (ly:stderr-redirect sock-fd "w")
    (set-current-output-port socket)
    (set-current-error-port socket))
  (display (format #f "GNU LilyPond Server ~a\n" (lilypond-version)) socket)
  (force-output socket)
  (hacklily:eval-one socket)
  (hacklily:debug "client done!")
  (hacklily:close)
  (primitive-exit))

(define (hacklily:start-server . args)
  (let* ((port (if (null? args) hacklily:default-port (car args)))
         (server-socket (hacklily:open-listening-socket port)))
    (newline hacklily:log-port)
    (hacklily:debug (format #f "Listening on port ~a" port))
    (hacklily:debug "Initializing LilyPond...")
    (ly:parse-init "declarations-init.ly")
    (hacklily:debug "LilyPond ready")
    (flush-all-ports)
    (while #t
      (let ((connection (accept server-socket)))
        (hacklily:fork-worker
          (lambda () (hacklily:client-handler (car connection))))
        ;; The worker (grandchild) holds its own dup of the connection
        ;; fd and sends EOF to the client via (hacklily:close). The
        ;; master must drop its own copy or it leaks one fd per request;
        ;; over a long-lived warm process that eventually exhausts
        ;; RLIMIT_NOFILE and kills accept (and with it the server).
        (close-port (car connection))))))

(define (hacklily:close)
  (shutdown hacklily:socket 1))