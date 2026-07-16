import { describe, expect, it } from 'vitest';
import { regularizeLogoDetails } from './regularizeLogoDetails';

describe('regularizeLogoDetails', () => {
  it('straightens a thin bar as a contained capsule', () => {
    const svg = '<svg viewBox="0 0 160 160"><path fill="#fff" d="M31 89h26l1 5c-3.32 3.32-9.36 1.04-14.06 1.06L31 95z"/></svg>';
    const output = regularizeLogoDetails(svg);

    expect(output).toContain('d="M34.76 89H54.24Q57.27 89 57.27 92.03Q57.27 95.06 54.24 95.06H34.76Q31.73 95.06 31.73 92.03Q31.73 89 34.76 89Z"');
  });

  it('makes a concentric badge ring exact and clips inner artwork to its inner ellipse', () => {
    const svg = '<svg viewBox="0 0 160 160"><path fill="#501b56" d="M80 0L120 10L150 40L160 80L150 120L120 150L80 160L40 150L10 120L0 80L10 40L40 10ZM80 10L115 18L142 45L150 80L142 115L115 142L80 150L45 142L18 115L10 80L18 45L45 18Z"/><path fill="#ffafdc" d="M0 0H160V160H0Z"/></svg>';
    const output = regularizeLogoDetails(svg);

    expect(output).toContain('fill-rule="evenodd"');
    expect(output).toContain('<clipPath id="svgcraft-logo-inner-boundary"><ellipse cx="80" cy="80" rx="70" ry="70"/></clipPath>');
    expect(output).toContain('clip-path="url(#svgcraft-logo-inner-boundary)"');
  });

  it('does not turn a compound square frame into a circular badge', () => {
    const svg = '<svg viewBox="0 0 160 160"><path fill="#501b56" d="M0 0H160V160H0ZM10 10H150V150H10Z"/></svg>';
    expect(regularizeLogoDetails(svg)).not.toContain('svgcraft-logo-inner-boundary');
  });

  it('does not rewrite large artwork or shapes without a curved end', () => {
    const svg = '<svg viewBox="0 0 160 160"><path fill="#fff" d="M10 10H40V16H10Z"/></svg>';
    expect(regularizeLogoDetails(svg)).toBe(svg);
  });

  it('turns a small polygonal dot into a true ellipse', () => {
    const svg = '<svg viewBox="0 0 160 160"><path fill="#fff" d="M35 35H43L45 37V44L42 47L38 48L33 45L32 39Z"/></svg>';
    expect(regularizeLogoDetails(svg)).toContain('M38.5 35A6.5 6.5 0 1 1 38.5 48A6.5 6.5 0 1 1 38.5 35Z');
  });

  it('rebuilds a stepped N with equal stems and continuous diagonals', () => {
    const svg = '<svg viewBox="0 0 160 160"><path fill="#501b56" d="M113 68H118L124 78L126 81L127 68H132V92H127L121 83L119 77H117V92H113Z"/></svg>';
    expect(regularizeLogoDetails(svg)).toContain(
      'd="M113 68H117.37L127.63 81.92V68H132V92H127.63L117.37 78.08V92H113Z"'
    );
  });

  it('rounds corners of large polygonal logo regions without expanding their bounds', () => {
    const svg = '<svg viewBox="0 0 160 160"><path fill="#fff" d="M20 20H120V120H20Z"/></svg>';
    const output = regularizeLogoDetails(svg);

    expect(output).toContain('Q20 20');
    expect(output).toContain('Q120 20');
    expect(output).not.toMatch(/C/);
  });

  it('removes a spurious curve from a mostly orthogonal glyph', () => {
    const svg = '<svg viewBox="0 0 160 160"><path fill="#501b56" d="M89 68h18v4H94v5h11l1 4c-1 1-1 1-3.5 1.1l-3.06-.04-3.07-.02L94 82v6h13v4H89z"/></svg>';
    const output = regularizeLogoDetails(svg);
    const d = output.match(/\bd="([^"]+)"/)?.[1] ?? '';

    expect(d).not.toMatch(/[CQ]/);
    expect(d).toMatch(/^M89 68L107 68L107 72L94 72L94 77/);
    expect(d).toMatch(/L105 81\.84L94 81\.84L94 88/);
  });

  it('squares a polygonal glyph edge without changing its overall bounds', () => {
    const svg = '<svg viewBox="0 0 160 160"><path fill="#501b56" d="M89 68H107V72H94V77H105L106 81L105 82H94V88H107V92H89Z"/></svg>';
    const output = regularizeLogoDetails(svg);
    const d = output.match(/\bd="([^"]+)"/)?.[1] ?? '';

    expect(d).toContain('L105 77L105 81.67L94 81.67');
    expect(d).toMatch(/^M89 68L107 68/);
  });

  it('rebuilds a traced sparkle as a softly rounded four-point star', () => {
    const svg = '<svg viewBox="0 0 420 380"><path fill="rgb(113, 134, 161)" stroke="rgb(113, 134, 161)" d="m358 15 4 1 5 12 5 7 14 6 2 2v3l-16 8h-2l-2 5-5 13-3 2-4-4-5-12-4-5-16-6-1-5 17-7 4-5 6-14Z"/></svg>';
    const output = regularizeLogoDetails(svg);

    const d = output.match(/\bd="([^"]+)"/)?.[1] ?? '';
    expect(d).toContain('M358.75 15.65Q359 15 359.25 15.65');
    expect(d.match(/Q/g)).toHaveLength(8);
    expect(d).toContain('Q388 44.5 387.37 44.79');
    expect(output).toContain('fill="rgb(113, 134, 161)"');
  });

  it('rebuilds a mountain with its detected shoulder and vertical side', () => {
    const svg = '<svg viewBox="0 0 420 380"><path fill="#ff6b6b" d="M68 289L100 257L129 230L158 201L164 198L171 199L185 214L197 226V308H100L75 304Z"/></svg>';
    const output = regularizeLogoDetails(svg);

    expect(output).toContain('M68.79 291.14Q68 289 69.66 287.43');
    expect(output).toContain('L195.27 224.52Q197 226 197 228.28L197 305.72Q197 308');
  });

  it('rebuilds the upper and lower accent guide with one exact stroke width', () => {
    const upper = 'M222 66L238 66L248 70L252 74L260 75L270 78L280 82L290 89L300 98L308 110L314 124L318 140L320 150L329 160L329 168L320 178L319 190L319 210L319 230L319 252L307 252L307 225L307 200L307 180L299 170L299 158L307 148L306 136L302 122L295 108L284 97L270 90L255 86L250 92L222 94Z';
    const lower = 'M307 279L319 279L319 286L318 294L315 303L311 311L305 319L298 324L290 329L282 332L274 334L265 335L250 335L235 335L221 335L221 323L240 323L255 323L273 322L282 319L290 314L298 306L303 298L306 289Z';
    const svg = `<svg viewBox="0 0 420 380"><path fill="#8b7cf6" stroke="#8b7cf6" d="${upper}"/><path fill="#8b7cf6" stroke="#8b7cf6" d="${lower}"/></svg>`;
    const output = regularizeLogoDetails(svg);

    expect(output.match(/stroke-width="9\.88"/g)).toHaveLength(2);
    expect(output).toContain('stroke-linecap="round"');
    expect(output).toContain('M251.96 79.95C288.34 79.95');
    expect(output).toContain('M314.06 285.92V296C314.06 314.38');
  });

  it('restores any colored opaque background after cutout geometry is regularized', () => {
    const svg = '<svg viewBox="0 0 420 380"><path fill="#f4ecd8" d="M0 0H420V380H0ZM330 42L359 15L388 44L359 74Z"/></svg>';
    expect(regularizeLogoDetails(svg)).toContain('d="M0 0H420V380H0Z"');
  });

  it('rebuilds frame elements with uniform strokes regardless of their color', () => {
    const frame = 'M103 72L130 72L160 72L190 72L198 76L198 84L190 86L160 86L130 86L101 87L85 92L73 103L66 118L64 150L64 190L64 230L64 270L69 302L82 318L101 324L140 324L180 324L197 327L197 335L160 335L120 335L90 332L70 321L58 303L54 287L54 240L54 190L54 145L54 121L60 98L75 82Z';
    const connector = 'M222 180L240 180L248 182L250 188L258 189L268 193L278 199L287 207L295 217L301 228L306 240L312 250L320 251L327 258L327 273L322 280L308 281L300 277L298 267L299 253L294 237L287 224L276 213L264 205L251 200L248 207L230 207L222 202Z';
    const svg = `<svg viewBox="0 0 420 380"><path fill="#2caa78" stroke="#2caa78" d="${frame}"/><path fill="#2caa78" stroke="#2caa78" d="${connector}"/></svg>`;
    const output = regularizeLogoDetails(svg);

    expect(output.match(/stroke-width="9\.88"/g)).toHaveLength(2);
    expect(output).toContain('M193.06 76.94H103.58C78.93 76.94 58.94 96.93 58.94 121.58');
    expect(output).toContain('M250.35 193.63C281.85 193.63 303.9 217.88 312.3 265.85');
    expect(output.match(/stroke-linecap="round"/g)).toHaveLength(2);
    expect(output).toContain('stroke="#2caa78"');
  });

  it('does not mistake a concave illustrated body region for a mountain', () => {
    const body = 'M70 308L80 285L95 270L88 250L120 238L140 215L160 198L175 204L165 225L190 245L175 265L197 308L160 285L130 308L100 288Z';
    const svg = `<svg viewBox="0 0 420 380"><path fill="#f3dfb8" d="${body}"/></svg>`;
    const output = regularizeLogoDetails(svg);
    const d = output.match(/\bd="([^"]+)"/)?.[1] ?? '';

    expect(d.match(/Q/g)?.length ?? 0).toBeGreaterThan(8);
  });

  it.each([
    {
      name: 'a tall convex body panel',
      body: 'M70 320L85 285L100 245L120 200L135 240L152 282L170 320H120Z',
      triangle: 'M70 320L120 200L170 320Z',
    },
    {
      name: 'a lower-body region touching the bottom edge',
      body: 'M50 360L75 320L100 275L125 240L150 275L175 320L200 360H125Z',
      triangle: 'M50 360L125 240L200 360Z',
    },
  ])('does not mistake $name for a mountain', ({ body, triangle }) => {
    const svg = `<svg viewBox="0 0 420 380"><path fill="#f3dfb8" d="${body}"/></svg>`;
    const output = regularizeLogoDetails(svg);
    const d = output.match(/\bd="([^"]+)"/)?.[1] ?? '';
    expect(d).not.toBe(triangle);
    expect(d.match(/Q/g)?.length ?? 0).toBeGreaterThan(5);
  });

  it('leaves detailed multi-path illustrations out of semantic primitive rebuilding', () => {
    const body = '<path fill="#f3dfb8" d="M68 289L100 257L129 230L158 201L164 198L171 199L185 214L197 226V308H100L75 304Z"/>';
    const details = Array.from(
      { length: 18 },
      (_, index) => `<path fill="#2b1a0d" d="M${220 + index} 40H${221 + index}V41H${220 + index}Z"/>`
    ).join('');
    const svg = `<svg viewBox="0 0 420 380">${body}${details}</svg>`;

    expect(regularizeLogoDetails(svg)).toBe(svg);
  });
});
