/* Exercise the libguile C APIs LilyPond leans on hardest:
   gsubrs (grob callbacks), foreign objects/smobs (Grob, Moment, ...),
   catch/throw across the C boundary (setjmp/longjmp), fluids,
   keywords, and module loading. */
#include <libguile.h>
#include <stdio.h>

static SCM
my_callback (SCM x, SCM y)
{
  return scm_product (x, scm_sum (y, scm_from_int (1)));
}

static SCM grob_type;

static SCM
make_grob (SCM name)
{
  return scm_make_foreign_object_1 (grob_type, scm_to_utf8_string (name));
}

static SCM
grob_name (SCM grob)
{
  scm_assert_foreign_object_type (grob_type, grob);
  return scm_from_utf8_string (scm_foreign_object_ref (grob, 0));
}

static SCM
throwing_body (void *data)
{
  scm_throw (scm_from_utf8_symbol ("lily-error"),
             scm_list_1 (scm_from_int (42)));
  return SCM_BOOL_F; /* not reached */
}

static SCM
catcher (void *data, SCM tag, SCM args)
{
  printf ("catch/throw across C: caught %s with %d\n",
          scm_to_utf8_string (scm_symbol_to_string (tag)),
          scm_to_int (scm_car (args)));
  return SCM_BOOL_T;
}

static void
inner (void *data, int argc, char **argv)
{
  /* gsubr registered from C, called from Scheme */
  scm_c_define_gsubr ("my-callback", 2, 0, 0, my_callback);
  SCM r = scm_c_eval_string ("(my-callback 6 6)");
  printf ("gsubr from scheme: %d\n", scm_to_int (r));

  /* foreign objects (lilypond's Grob/Moment/Prob wrappers) */
  grob_type = scm_make_foreign_object_type (
      scm_from_utf8_symbol ("<grob>"),
      scm_list_1 (scm_from_utf8_symbol ("name")), NULL);
  scm_c_define_gsubr ("make-grob", 1, 0, 0, make_grob);
  scm_c_define_gsubr ("grob-name", 1, 0, 0, grob_name);
  r = scm_c_eval_string ("(grob-name (make-grob \"NoteHead\"))");
  printf ("foreign object: %s\n", scm_to_utf8_string (r));

  /* escape-only catch/throw (lilypond's error handling) */
  scm_internal_catch (SCM_BOOL_T, throwing_body, NULL, catcher, NULL);

  /* modules lilypond's scm/ tree uses */
  r = scm_c_eval_string (
      "(begin (use-modules (srfi srfi-1) (ice-9 regex) (ice-9 format))"
      "  (list (fold + 0 '(1 2 3))"
      "        (match:substring (string-match \"c[a-z]+\" \"a cello\"))"
      "        (format #f \"~r\" 42)))");
  scm_write (r, scm_current_output_port ());
  scm_newline (scm_current_output_port ());

  /* fluids + dynamic-wind (used by lilypond's parser state) */
  r = scm_c_eval_string (
      "(let ((f (make-fluid 'out)))"
      "  (with-fluids ((f 'in)) (fluid-ref f)))");
  printf ("fluids: %s\n", scm_to_utf8_string (scm_symbol_to_string (r)));

  printf ("LILY-API TEST: PASS\n");
}

int
main (int argc, char **argv)
{
  scm_boot_guile (argc, argv, inner, NULL);
  return 0;
}
