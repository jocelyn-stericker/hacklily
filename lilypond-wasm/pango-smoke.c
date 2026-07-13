/* Smoke test for the wasm pango/cairo/fontconfig/freetype stack:
 * lay out text with Pango (fontconfig font map -> pangoft2/harfbuzz) and
 * render it to an SVG via cairo — the same text path LilyPond's cairo
 * backend uses. Expects FONTCONFIG_FILE to point at a fonts.conf whose
 * <dir> holds at least one scalable font (preloaded into MEMFS).
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <cairo.h>
#include <cairo-svg.h>
#include <pango/pangocairo.h>

int main(void)
{
  cairo_surface_t *surf = cairo_svg_surface_create("out.svg", 400, 100);
  cairo_t *cr = cairo_create(surf);

  PangoLayout *layout = pango_cairo_create_layout(cr);
  pango_layout_set_text(layout, "LilyPond \xe2\x99\xa9 wasm", -1);
  PangoFontDescription *desc = pango_font_description_from_string("Sans 24");
  pango_layout_set_font_description(layout, desc);
  pango_font_description_free(desc);

  PangoFontMap *fm = pango_context_get_font_map(pango_layout_get_context(layout));
  PangoFont *font = pango_font_map_load_font(fm,
      pango_layout_get_context(layout),
      pango_layout_get_font_description(layout) ?
        pango_layout_get_font_description(layout) : NULL);
  if (font) {
    PangoFontDescription *d = pango_font_describe(font);
    printf("resolved font: %s\n", pango_font_description_to_string(d));
  }

  int w = 0, h = 0;
  pango_layout_get_pixel_size(layout, &w, &h);
  printf("layout size: %dx%d\n", w, h);

  cairo_move_to(cr, 10, 30);
  pango_cairo_show_layout(cr, layout);

  g_object_unref(layout);
  cairo_destroy(cr);
  cairo_surface_finish(surf);
  cairo_surface_destroy(surf);

  FILE *f = fopen("out.svg", "rb");
  if (!f) { printf("PANGO-CAIRO TEST: FAIL (no svg)\n"); return 1; }
  fseek(f, 0, SEEK_END);
  long n = ftell(f);
  fseek(f, 0, SEEK_SET);
  char *buf = malloc(n + 1);
  fread(buf, 1, n, f);
  buf[n] = 0;
  fclose(f);

  int ok = n > 500 && strstr(buf, "<svg") &&
           (strstr(buf, "glyph") || strstr(buf, "<path") || strstr(buf, "<g "));
  printf("svg bytes: %ld\n", n);
  printf("PANGO-CAIRO TEST: %s\n", ok && w > 0 && h > 0 ? "PASS" : "FAIL");
  return ok ? 0 : 1;
}
