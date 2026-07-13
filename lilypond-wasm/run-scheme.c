/* Eval argv[1] as a Scheme expression, print the result and wall time. */
#include <libguile.h>
#include <stdio.h>
#include <sys/time.h>

static double now_ms (void) {
  struct timeval tv;
  gettimeofday (&tv, NULL);
  return tv.tv_sec * 1000.0 + tv.tv_usec / 1000.0;
}

static void inner (void *data, int argc, char **argv) {
  const char *expr = argc > 1 ? argv[1] : "(+ 1 2)";
  double t0 = now_ms ();
  SCM v = scm_c_eval_string (expr);
  double t1 = now_ms ();
  scm_write (v, scm_current_output_port ());
  scm_newline (scm_current_output_port ());
  printf ("eval: %.1f ms\n", t1 - t0);
}

int main (int argc, char **argv) {
  scm_boot_guile (argc, argv, inner, NULL);
  return 0;
}
