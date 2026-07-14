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
});
