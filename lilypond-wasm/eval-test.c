/* Spike kill-criterion test: boot libguile under wasm, eval (+ 1 2). */
#include <libguile.h>
#include <stdio.h>

static void inner(void *data, int argc, char **argv) {
  SCM v = scm_c_eval_string("(+ 1 2)");
  printf("(+ 1 2) => %ld\n", scm_to_long(v));

  /* A bit more than arithmetic: strings, GC churn, closures. */
  SCM r = scm_c_eval_string(
      "(let loop ((i 0) (acc '()))"
      "  (if (< i 10000)"
      "      (loop (+ i 1) (cons (number->string i) acc))"
      "      (string-length (apply string-append acc))))");
  printf("gc-churn => %ld\n", scm_to_long(r));

  SCM version = scm_c_eval_string("(version)");
  char *s = scm_to_locale_string(version);
  printf("guile version: %s\n", s);
  free(s);
}

int main(int argc, char **argv) {
  scm_boot_guile(argc, argv, inner, NULL);
  return 0; /* not reached; scm_boot_guile exits */
}
