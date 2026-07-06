# Vectorization size notes

## Shared borders

The current icon pipeline quantizes the source to an approved palette, builds one
binary mask per color, traces each mask independently, and paints those layers in
order with likely line colors last. This preserves useful editing semantics:
each color remains a distinct layer, the dark outline stays on top, and each
path has a direct fill color that the workspace can inspect and edit.

That structure duplicates shared borders. When two color regions touch, each
mask owns and traces its side of the boundary, so the generated SVG can contain
two nearly identical edge runs. Removing that duplication safely is a structural
change, not a post-processing tweak.

Two possible approaches:

- Detect coincident edges after tracing and rewrite the affected paths to share
  boundary segments. This keeps the current per-layer control, but it requires
  robust geometric matching across cubic/quadratic/polygon path data and is
  brittle around antialiasing, dilation, and smoothing.
- Trace a single indexed image where each palette region is solved as one
  segmentation problem. This can avoid duplicated borders by construction and
  usually produces lighter SVGs, but it gives up part of the current control over
  per-color masks, fill overlap, and the final outline layer.

For the size pass, SVGO and source-emission tuning are lower risk: they reduce
bytes without changing palette choice, layer ownership, or outline ordering.
