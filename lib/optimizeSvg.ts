import { optimize as optimizeWithSvgo, type Config as SvgoConfig } from 'svgo/browser';

// Lightweight SVG size optimizer for imagetracerjs output.
// imagetracerjs writes, on every <path>:
//   fill="rgb(r,g,b)" stroke="rgb(r,g,b)" stroke-width="1" opacity="1"
// The stroke duplicates the fill color. Keeping a thin same-color stroke helps
// seal anti-aliased seams; stripping it shrinks the file when seam sealing is
// disabled.

interface OptimizeOptions {
  /** Remove the per-path stroke + stroke-width (default true — fills already cover the shape). */
  removeStroke?: boolean;
  /** Drop opacity="1" attributes (they are the default and redundant). */
  dropDefaultOpacity?: boolean;
  /** Round path coordinates to this many decimals. Omit to leave coordinates untouched. */
  coordDecimals?: number;
  /** Compress whitespace inside path `d` attributes (default true). */
  compressPaths?: boolean;
  /** Convert rgb(r,g,b) color attributes to shorter hex notation (default true). */
  minifyColors?: boolean;
  /** Run SVGO after the targeted imagetracer cleanup (default true). */
  svgo?: boolean;
  /** Allow SVGO to merge adjacent/same-style paths (default true). Disable for path-level editing. */
  mergePaths?: boolean;
  /** Split compound path data with multiple absolute M commands into separate editable paths. */
  splitCompoundPaths?: boolean;
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

function toHexByte(value: number): string {
  return Math.max(0, Math.min(255, value)).toString(16).padStart(2, '0');
}

function minifyRgbColors(svg: string): string {
  return svg.replace(/(fill|stroke)="rgb\((\d+),\s*(\d+),\s*(\d+)\)"/g, (_full, attr, r, g, b) => {
    const rr = toHexByte(Number(r));
    const gg = toHexByte(Number(g));
    const bb = toHexByte(Number(b));
    const canShorten = rr[0] === rr[1] && gg[0] === gg[1] && bb[0] === bb[1];
    const hex = canShorten ? `#${rr[0]}${gg[0]}${bb[0]}` : `#${rr}${gg}${bb}`;
    return `${attr}="${hex}"`;
  });
}

function splitPathDataOnAbsoluteMove(d: string): string[] {
  const starts: number[] = [];
  const moveRe = /M(?=[\s+\-.\d])/g;
  let match: RegExpExecArray | null;

  while ((match = moveRe.exec(d)) !== null) {
    starts.push(match.index);
  }

  if (starts.length <= 1) return [d];

  return starts
    .map((start, index) => d.slice(start, starts[index + 1]).trim())
    .filter((part) => part.length > 0);
}

function splitCompoundPathElements(svg: string): string {
  return svg.replace(/<path\b([^>]*?)\bd="([^"]+)"([^>]*)>/g, (full, before: string, d: string, after: string) => {
    const parts = splitPathDataOnAbsoluteMove(d);
    if (parts.length <= 1) return full;

    return parts.map((part) => `<path${before}d="${part}"${after}>`).join('');
  });
}

function setRootStrokeWidth(svg: string, strokeWidth: number): string {
  return svg.replace(/<svg\b([^>]*)>/, (full, attrs: string) => {
    const cleanedAttrs = attrs.replace(/\s*stroke-width="[^"]*"/g, '');
    return `<svg${cleanedAttrs} stroke-width="${strokeWidth}">`;
  });
}

function runSvgo(svg: string, coordDecimals?: number, mergePaths = true): string {
  const floatPrecision = typeof coordDecimals === 'number'
    ? Math.max(0, Math.min(3, coordDecimals))
    : 1;
  type SvgoPlugin = NonNullable<SvgoConfig['plugins']>[number];
  const presetDefaultPlugin = (mergePaths
    ? {
        name: 'preset-default' as const,
        params: {
          floatPrecision,
          overrides: {
            cleanupIds: false,
            // Path order is semantic for this tracer: fills are painted first,
            // dark/line layers last. Do not let SVGO sort or reorder content.
            sortAttrs: false,
          },
        },
      }
    : {
        name: 'preset-default' as const,
        params: {
          floatPrecision,
          overrides: {
            cleanupIds: false,
            sortAttrs: false,
            mergePaths: false,
          },
        },
      }) as unknown as SvgoPlugin;
  const config: SvgoConfig = {
    multipass: true,
    js2svg: {
      indent: 0,
      pretty: false,
    },
    plugins: [
      presetDefaultPlugin,
      'removeDimensions',
      'removeXMLProcInst',
      'removeComments',
      'removeMetadata',
      {
        name: 'convertPathData',
        params: {
          floatPrecision,
          transformPrecision: floatPrecision,
          noSpaceAfterFlags: true,
          utilizeAbsolute: false,
        },
      },
    ],
  };
  const result = optimizeWithSvgo(svg, config);

  return result.data;
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
    minifyColors = true,
    svgo = true,
    mergePaths = true,
    splitCompoundPaths = false,
    sealSeams,
  } = opts;

  let out = svg;

  if (sealSeams && sealSeams > 0) {
    // Give every path a thin stroke equal to its fill so adjacent shapes grow
    // slightly and cover the hairline gaps that show the background through.
    // First strip any existing stroke attrs, then add matching strokes. The
    // width is inherited from the root so it is not repeated on every path.
    out = out
      .replace(/\s*stroke="[^"]*"/g, '')
      .replace(/\s*stroke-width="[^"]*"/g, '')
      .replace(/<path([^>]*?)fill="([^"]+)"([^>]*?)>/g,
        (_full, pre: string, fill: string, post: string) =>
          `<path${pre}fill="${fill}" stroke="${fill}"${post}>`);
    out = setRootStrokeWidth(out, sealSeams);
  } else if (removeStroke) {
    out = out
      .replace(/\s*stroke="[^"]*"/g, '')
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

  if (minifyColors) {
    out = minifyRgbColors(out);
  }

  if (splitCompoundPaths) {
    out = splitCompoundPathElements(out);
  }

  // Collapse runs of whitespace between tags/attributes that the above may leave.
  out = out
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();

  if (svgo) {
    out = runSvgo(out, coordDecimals, mergePaths);
  }

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
