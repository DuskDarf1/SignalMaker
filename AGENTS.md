# SignalMaker

SignalMaker is a minimal traffic signal editor based on the UI of the sibling
`SignMaker v2.2` project.

## UI convention

- SignMaker v2.2 MUST be used as the reference for every UI similarity. Inspect
  its actual HTML, CSS, and interaction code before implementing or changing a
  matching control. Reuse those conventions directly; do not approximate them
  from memory or introduce a replacement design.
- Use the same UI as SignMaker v2.2: its blue light/dark palettes, Inter and
  Overpass typography, square controls, bottom toolbar, top-left editor panels,
  and selector popover. Preserve its minimal styling; do not introduce a new
  design system, decorative cards, or custom UI controls.
- Keep toolbar buttons compact, with smaller labels, icons, spacing, and padding.
- Main tools, in order: Support Editor (replaces Post Settings), Heads (replaces
  the panel dropdown), Head Editor, Street Signs, Regulatory Signs, Phases, and Approaches.
- Keep the MUTCD link, copy, download, and dark mode buttons.
- Follow SignMaker's automatic theme behavior: use the system theme at startup
  and respond to system changes live. Manual toggles are session overrides;
  resume following the system when it matches the override. Do not persist theme
  overrides across reloads.
- Keep narrow-screen behavior usable and retain accessible control names and
  visible keyboard focus.
- Heads MUST follow SignMaker's panel selector: adding, duplicating, or selecting
  a head keeps the popup open. New and duplicate heads use the next available
  `Head N` name, without a `copy` suffix. Popup rows drag to reorder with the
  same wiggle, faded source, active border, and insertion markers. Preserve
  selection, custom names, list scroll/focus, and mounted positions when reordering;
  support touch dragging and up/down arrow keys as well.
- Selection uses SignMaker's 500 ms yellow outline flash. Viewer dragging uses
  its 0.12 s, ±2° wiggle, 1.02 scale, random delay, and faded source. Without a
  support, dragging reorders heads with insertion markers. On a mast arm or span wire, it
  changes only the dragged head's position along the arm. Indication rows use
  its APL Move drag handle and Delete button. Support touch dragging, keyboard
  indication reordering, and left/right arrow keys for mounted head positions.
- Keep heads at a modest preview scale (a default head is roughly 200 px tall),
  fitting smaller where space requires. Mast assemblies fit their full physical
  extent; do not enlarge heads independently of the support. Do not show computed
  measurement readouts.
- Support Editor's Head Alignment follows SignMaker's Post Settings control:
  Center (default), Top, and Bottom. Preview, copy, and download must agree.
- Copy follows SignMaker's hourglass while copying, activated checkmark on success
  (restore after 1400 ms), and error/download feedback (1800 ms). Right-click
  opens its context menu pattern to copy one head. Preserve accessible feedback.

## Scope and implementation

- Signal heads support creation, duplication, removal, and live editing. Each
  indication has an independent color, symbol (including U-turn and bicycle),
  and 8/12-inch size. Do not add an Illuminated control until requested again.
- Linear heads may be vertical or horizontal. Five-section clusters MUST be
  vertical, including when restoring saved state. Cluster layouts always contain
  five indications. Switching back to linear keeps their edits.
- Head Editor's Layout dropdown selects Linear, 5-section cluster, or HAWK beacon.
  HAWK faces follow MUTCD Figure 4J-3: two circular reds horizontally aligned
  above a centered circular yellow. Keep three fixed positions, colors and ball
  symbols; individual 8/12-inch lens sizes remain editable. HAWKs stay upright.
- Heads have no, plain, or retroreflective backplates; spacing measures the gap
  between their visible housing/backplate edges. New heads default to
  retroreflective backplates with round corners. Copy/download export a PNG.
- Keep the current generic backplates. Plate Corners uses SignMaker's Sharp/Round
  dropdown convention. Round outward (convex) corners only; inward (concave)
  corners MUST stay sharp on the plate and reflective-band contours.
  Five-section heads and HAWK beacons can use a Full Rectangle without stepped corners.
  These settings are per head and survive duplication and restoration.
- Every head has a fixed 75% visor; do not show a Visor setting. Draw the upper
  three-quarter rim around each indication, upright even in horizontal heads.
  Use identical geometry in preview, copy and download. Older saved Half/Full
  choices restore as 75%.
- U-turn indications MUST use the actual vector artwork from MUTCD 11th Edition
  Figure 4E-1, including its separate broad chevron and curved stem. Preserve its
  proportions at both lens sizes; do not substitute a hand-drawn approximation.
- Support Editor contains support kind (None, Mast arm, or Span wire), length in
  feet, support color, and head alignment. Follow SignMaker's Post Settings
  dropdown pattern for support kind and Silver/Black/Brown/Red colors. Do not
  offer custom colors; older saved custom colors restore as Silver.
  Use FDOT 649-030/649-031 for mast proportions and
  634-001/649-010 for paired span cables and steel strain poles, and 641-010 for
  concrete strain poles. Document derived
  geometry. Supports use the selected base color, shaded solid faces, caps, and
  plate edges for the requested 3-D appearance; keep signals in their front view.
- Mast Arm Side selects Left or Right. Mirror only the support and head positions,
  keeping indications upright and directional symbols unchanged. Head positions
  remain distances from the arm connection; dragging and arrow keys must account
  for the side. Switching sides must not change saved distances or head order.
  Arm Angle ranges from 0° to +15° in 0.2° increments, rising away from either
  pole side. Saved lengths and positions measure along the sloped arm; project
  them for dragging, bounds, and equal clear gaps. Signal Alignment selects
  Same height (preserving Center/Top/Bottom) or Mast arm center (each envelope
  center follows the arm). Heads and signs stay upright. Fit the full sloped
  support in preview/export and attach each street-sign hanger at its own height.
  Bow Angle adds 0°–20° of downward curvature in 0.2° steps at a movable Bow Point
  measured in feet from the connection. Bow Width selects the circular transition
  length from 1 foot to the full arm length using a slider and number input.
  Increasing width spreads the same angle change more gradually. Clamp the bow
  point so its whole transition fits, and retain width in saved projects.
  Use a smooth circular transition;
  default to 0° for older projects. Preserve the physical arm length, taper,
  independent mounting distances, alignment choices, and bow settings when
  switching support types. Use the curve and its inverse horizontal mapping
  for placement, bounds, dragging, equal spacing, and each street-sign hanger.
- Span wires have independent left/right post heights and base widths. Mast and
  span lengths are saved separately. Each head hangs from the paired cables with
  its own position from the left wire connection. Preserve the wire sag and
  mounting stems in preview and export when positions or post heights change.
- Span Post Material selects Steel or Concrete using the same native dropdown
  pattern. Concrete uses rectangular chamfered faces, the FDOT 641-010 total
  taper of 0.162 in/ft, and eyebolt attachments. Draw concrete to grade with no
  steel base plate or round cap. Preserve dimensions, colors, head positions,
  and selection when switching materials, and save the material locally.
- Each mounted head has its own physical position from the support's connection
  face, edited in Head Editor or by dragging. Moving, adding, duplicating, or
  removing a head must not redistribute the others. Length/geometry changes
  only clamp heads outside the usable arm. Hide the free-row gap control while
  a support is active. Preserve positions when switching supports off and on.
- Heads and Support Editor have a **Space all heads evenly** button. This explicit
  action creates equal clear gaps between the housing/backplate envelopes and
  at both support ends, preserving physical order, popup order, and selection.
  Disable it without a support, with fewer than two heads, or when the heads
  cannot fit on the support. Free-standing heads already share one gap setting.
- Whole-scene copy/download includes the support. Copying one head from the
  context menu omits the support. Either support can be exported without heads.
- Phases and Approaches remain reserved until requested.
- Keep physical dimensions in inches, separate from preview/export pixel scale.
  Document references and geometry approximations in the source code.
- Keep saved state local to the browser; gracefully handle unavailable storage.
- Use plain HTML, CSS, and JavaScript. No framework or build step is needed.
- Street Signs uses SignMaker v2.2's Panel Style and Control Text controls and
  font choices. New street signs have one Control Text row, Green panel, Sharp
  corners, radius 0, Series EM, 200% font size, and 75% line height.
  Use a native text-row dropdown for multiple rows; do not show Control Text chips.
  Allow one uploaded icon on either side of the lettering, preserving proportions
  and transparency, local restoration, duplication, and whole-scene exports.
  Mast signs select Free swinging (FDOT 700-050 Option 1 paired hangers) or
  Directly mounted (centered on the arm), and move independently by pointer,
  touch, position controls, and mirrored left/right keys. Span street signs
  always hang from a fixed pole-mounted braced cantilever; do not allow wire
  dragging. Keep the mast mounting and distance when switching support kind.
  Preserve sign/text edits and selection in storage and duplication, and include
  sign faces, hardware, and fonts in whole-scene PNG exports. Individual head
  copy omits street signs. Record schematic mounting dimensions in source comments.
- Keep SignMaker's unrelated shields, arrows, templates, full sign renderer,
  and asset libraries removed. Only the requested street-sign text controls,
  palette, and fonts are reused.
- Regulatory Signs has its own bottom-toolbar tab. Reuse SignMaker v2.2’s
  searchable icon-picker dialog, thumbnail grid, click-to-select/close behavior,
  and current-selection label for the regulatory sign picker. Keep keyboard
  access, focus restoration, and the original theme styles. Keep the local PNG
  catalog in `assets/regulatory-signs/`. Scope is traffic-signal signs and their variants,
  not freeway/HOV managed-lane signing. Preserve official artwork, provenance,
  nominal dimensions, and extraction metadata. Exclude signs with
  specific time schedules. The only blank-out designs are No Left Turn, No Right
  Turn, No Turn on Red, and Yield to Pedestrians. Preserve saved On/Off states,
  white legend/red prohibition on black, and an opaque blank face when off.
  Regulatory signs use one Size slider that preserves proportions; new static
  regulatory signs and blank-outs default to Directly mounted.
  Retain size in duplication, restoration, and export. Clicking or tapping
  either kind of sign selects it and opens its corresponding editor, including
  mounted signs.
- Regulatory signs move independently along either mast arms or paired span
  wires by pointer, touch, keyboard, or position controls. Save `armPosition` and
  `spanPosition` separately. Use the existing curved/mirrored mast mapping and
  attach span hangers to both cables. Street-name signs retain their fixed span
  pole cantilevers. All regulatory artwork must appear identically in preview
  and whole-scene PNG exports; individual head copy omits all signs.
- Only modify SignalMaker. Leave the original SignMaker v2.2 project untouched.
- Preserve the inherited GPL license and attribution when reusing its UI.
