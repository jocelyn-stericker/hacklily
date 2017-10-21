1. Render Flow
==============

De-serialization (JSON -> "UNVALIDATED")
----------------------------------------
  0. MusicXML is translated into MXMLJSON                      (MusicXML.parse)
  1. MXMLJSON is converted to Satie Models                (MXML.Import.toScore)
  2. Model does initial housework                        (IModel.modelDidLoad$)

Validation ("UNVALIDATED" -> "VALIDATED")
-----------------------------------------
  3. A model reads the context given to it by models before it
     in a bar and can modify context the for future models.  (IModel.validate$)
  4. Layout is guessed within a bar, voice, and staff           (IModel.layout)

     Models can pretend there is only one voice and one
     staff. The engine itself handles merging voices and staffs,
     as well as complex notation involving one voice across
     multiple staves.

     Layouts for VALIDATED and RENDERED models are memoized,
     so that neither validate$ layout need to be called on
     Models when a change happens that does not affect it.

Lay-out ("VALIDATED" -> "RENDERED")
-----------------------------------
  5. Context gets assigned a page and line based on guess      (Engine.layout$)
  6. Actual layout created                                      (IModel.layout)
  7. Layout is justified or semi-justified, and assigned a
     vertical position
  8. Elements outside of staff (lyrics, notations, ...) are
     positioned

2. Box Model
============

Satie's layout model is based on MusicXML's default and relative positioning.
See MusicXML.Position. Contrary to SVG where the origin is the top left corner,
the origin in MusicXML and Satie is the bottom left corner.

The position of an object, in SVG coordinates scaled to equal tenths, is calculated as:
 x = context.originX + layout.model.defaultX + model.relativeX
 y = context.originY - layout.model.defaultY - model.defaultY

relativeX and relativeY
-----------------------
Manual or special-case changes to the default position calculated in validate$ or fit$.

defaultX and defaultY
---------------------
These values are generally calculated in the layout layer of the engraving process, but
can be set manually. Layouts extend the model they hold via prototypical inheritance
to set defaultX and defaultY if it was not already set in the manual.

originX and originY
-------------------
Different objects have different positions in MusicXML. For example, credits are relative
to (0, height), so originX = 0 and originY = height. Notes are relative to the top (!!) left
of a measure. See MusicXML documentation for each component. originX and originY are set
by React context.

React provides three ways of storing information. State is useful for storing data used by
the same component that sets it. Props is useful for passing date from one component
to its direct children. Context is like props, but can be passed to non-direct children. It
is currently undocumented. See MeasureView and Attributes for an example of context is used.

3. Editing Flow
===============

Editing ("RENDERED" -> "UNVALIDATED")
-------------------------------------
  When any element in a measure is added, removed, or modified, all items in that
  measure go from the RENDERED state to the UNVALIDATED state.

  Note: some changes are done without changing the context model or layout
  model state. These changes are made with {dangerous: true}, and are used
  to provide constant time previews in Ripieno.

Line switches ("RENDERED" -> "VALIDATED")
-----------------------------------------
  When a measure is moved from one line to another, all models in the two lines
  that are RENDERED become VALIDATED. This implies that models must remain CLEAN
  when switching lines, and CLEAN Models must not mutate based on what else is on
  the same line, but not the same measure, as it. Instead, this information must
  be kept in IModel.layout. This constraint ensures linear time updates on the
  number of models on lines modified and promotes robustness.

  Keep in mind:
    - Every measure must have a valid Attributes which can be unhidden
      (via its ILayout!) if it becomes the first in a line.
    - Every measure must also have a valid warning Clef at the end which can be
      unhidden via ILayout.
    - Concerns related to accidentals and the vertical position of notes in a
      staff must be done in layout without changes to the Model.

