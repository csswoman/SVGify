export const MIN_CANVAS_PX = 200;

export interface CanvasViewBoxSize {
  w: number;
  h: number;
}

export interface CanvasDisplayBounds {
  maxWidth: number;
  maxHeight: number;
}

export interface CanvasDisplaySize {
  width: number;
  height: number;
}

function fallbackSize(): CanvasDisplaySize {
  return { width: MIN_CANVAS_PX, height: MIN_CANVAS_PX };
}

export function computeCanvasDisplaySize(
  viewBox: CanvasViewBoxSize,
  bounds: CanvasDisplayBounds
): CanvasDisplaySize {
  const { w, h } = viewBox;
  const { maxWidth, maxHeight } = bounds;

  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return fallbackSize();
  }
  if (!Number.isFinite(maxWidth) || !Number.isFinite(maxHeight) || maxWidth <= 0 || maxHeight <= 0) {
    return fallbackSize();
  }

  const fitScale = Math.min(maxWidth / w, maxHeight / h, 1);
  let width = w * fitScale;
  let height = h * fitScale;

  const shorter = Math.min(width, height);
  if (shorter < MIN_CANVAS_PX) {
    const bump = MIN_CANVAS_PX / shorter;
    width *= bump;
    height *= bump;
  }

  return { width: Math.round(width), height: Math.round(height) };
}

/** Smaller minimum for split vectorize previews so two fit in the viewport. */
export const MIN_VECTORIZE_PREVIEW_PX = 120;

export const VECTORIZE_PREVIEW_MAX_HEIGHT_PX = 300;

export function computeVectorizePreviewBounds(
  panelWidth: number,
  twoColumns: boolean
): CanvasDisplayBounds {
  const horizontalPadding = 32;
  const columnGap = twoColumns ? 16 : 0;
  const columnCount = twoColumns ? 2 : 1;
  const maxWidth = Math.max(
    1,
    (panelWidth - horizontalPadding - columnGap) / columnCount
  );
  const maxHeight = Math.min(
    Math.round(window.innerHeight * (twoColumns ? 0.32 : 0.36)),
    VECTORIZE_PREVIEW_MAX_HEIGHT_PX
  );
  return { maxWidth, maxHeight };
}

export function computeVectorizePreviewSize(
  viewBox: CanvasViewBoxSize,
  bounds: CanvasDisplayBounds
): CanvasDisplaySize {
  const { w, h } = viewBox;
  const { maxWidth, maxHeight } = bounds;

  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return { width: MIN_VECTORIZE_PREVIEW_PX, height: MIN_VECTORIZE_PREVIEW_PX };
  }
  if (!Number.isFinite(maxWidth) || !Number.isFinite(maxHeight) || maxWidth <= 0 || maxHeight <= 0) {
    return { width: MIN_VECTORIZE_PREVIEW_PX, height: MIN_VECTORIZE_PREVIEW_PX };
  }

  const fitScale = Math.min(maxWidth / w, maxHeight / h, 1);
  let width = w * fitScale;
  let height = h * fitScale;

  const shorter = Math.min(width, height);
  if (shorter < MIN_VECTORIZE_PREVIEW_PX) {
    const bump = MIN_VECTORIZE_PREVIEW_PX / shorter;
    width *= bump;
    height *= bump;
  }

  return { width: Math.round(width), height: Math.round(height) };
}
