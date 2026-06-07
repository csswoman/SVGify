// Lightweight, dependency-free SVG size optimizer for imagetracerjs output.
// imagetracerjs writes, on every <path>:
//   fill="rgb(r,g,b)" stroke="rgb(r,g,b)" stroke-width="1" opacity="1"
// The stroke duplicates the fill color and is usually unwanted, and the
// coordinate numbers carry trailing zeros. Stripping these shrinks the file
// substantially without changing the visible result.

interface OptimizeOptions {
  /** Remove the per-path stroke + stroke-width (default true — fills already cover the shape). */
  removeStroke?: boolean;
  /** Drop opacity="1" attributes (they are the default and redundant). */
  dropDefaultOpacity?: boolean;
  /** Round path coordinates to this many decimals. Omit to leave coordinates untouched. */
  coordDecimals?: number;
  /** Compress whitespace inside path `d` attributes (default true). */
  compressPaths?: boolean;
  /**
   * Seal hairline gaps between adjacent shapes by giving each path a thin stroke
   * of its own fill color. When set, this overrides removeStroke. The number is
   * the stroke width (in SVG user units); ~0.5–1 works well.
   */
  sealSeams?: number;
}

/**
 * Compress the whitespace in a single path `d` value without changing geometry.
 * imagetracerjs emits "M 12 34 L 56 78 Z " — we can drop the space after a
 * command letter and before/around Z, and collapse number separators.
 */
function compressPathData(d: string): string {
  return d
    .replace(/\s+/g, ' ')           // collapse runs of whitespace
    .replace(/\s*([MLCQAZHVSTmlcqazhvst])\s*/g, '$1') // no space around command letters
    .replace(/(\d)\s+(-)/g, '$1$2') // "12 -3" → "12-3" (sign is a valid separator)
    .trim();
}

/**
 * Optimize an imagetracerjs SVG string. Operates on the raw string with
 * targeted regexes (the structure is known and machine-generated), so it is
 * fast and does not require a DOM.
 */
export function optimizeSvg(svg: string, opts: OptimizeOptions = {}): string {
  const {
    removeStroke = true,
    dropDefaultOpacity = true,
    coordDecimals,
    compressPaths = true,
    sealSeams,
  } = opts;

  let out = svg;

  if (sealSeams && sealSeams > 0) {
    // Give every path a thin stroke equal to its fill so adjacent shapes grow
    // slightly and cover the hairline gaps that show the background through.
    // First strip any existing stroke attrs, then add matching ones.
    out = out
      .replace(/\s*stroke="[^"]*"/g, '')
      .replace(/\s*stroke-width="[^"]*"/g, '')
      .replace(/<path([^>]*?)fill="(rgb\([^)]*\))"([^>]*?)>/g,
        (_full, pre: string, fill: string, post: string) =>
          `<path${pre}fill="${fill}" stroke="${fill}" stroke-width="${sealSeams}"${post}>`);
  } else if (removeStroke) {
    out = out
      .replace(/\s*stroke="rgb\([^)]*\)"/g, '')
      .replace(/\s*stroke-width="[^"]*"/g, '');
  }

  if (dropDefaultOpacity) {
    // opacity="1" / opacity="1.0" are the default — remove them.
    out = out.replace(/\s*opacity="1(?:\.0+)?"/g, '');
  }

  if (typeof coordDecimals === 'number') {
    // Round long decimals inside path data (e.g. 12.345678 → 12.35).
    out = out.replace(/-?\d+\.\d+/g, (m) => {
      const n = Number(m);
      return Number.isFinite(n) ? String(Number(n.toFixed(coordDecimals))) : m;
    });
  }

  if (compressPaths) {
    out = out.replace(/d="([^"]*)"/g, (_full, d: string) => `d="${compressPathData(d)}"`);
  }

  // Collapse runs of whitespace between tags/attributes that the above may leave.
  out = out.replace(/[ \t]{2,}/g, ' ');

  return out;
}

/** Human-readable byte size of a string (UTF-8). */
export function svgByteSize(svg: string): number {
  return new TextEncoder().encode(svg).length;
}

/** Format a byte count as a short human string (e.g. "812 KB", "5.8 MB"). */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
