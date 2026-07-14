export function sanitizeSvgString(svgString: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');

  if (doc.documentElement.tagName === 'parsererror') {
    throw new Error('Invalid SVG');
  }

  const svg = doc.documentElement as unknown as SVGElement;

  // Remove dangerous elements
  const dangerousElements = svg.querySelectorAll('script, foreignObject, style, iframe, object, embed, link, meta, title, base');
  dangerousElements.forEach((el) => el.remove());

  // Remove event handlers and javascript: URLs
  const allElements = svg.querySelectorAll('*');
  allElements.forEach((el) => {
    // Remove on* attributes
    const attrs = Array.from(el.attributes);
    attrs.forEach((attr) => {
      if (attr.name.toLowerCase().startsWith('on')) {
        el.removeAttribute(attr.name);
      }

      // Remove javascript: URLs in href/xlink:href
      if ((attr.name === 'href' || attr.name === 'xlink:href') && attr.value.startsWith('javascript:')) {
        el.removeAttribute(attr.name);
      }

      // Remove data: URLs that could be malicious (except data:image)
      if (attr.name === 'href' || attr.name === 'xlink:href') {
        if (attr.value.startsWith('data:') && !attr.value.startsWith('data:image/')) {
          el.removeAttribute(attr.name);
        }
      }
    });

    // Handle <use> elements pointing off-document
    if (el.tagName.toLowerCase() === 'use') {
      const href = el.getAttribute('href') || el.getAttribute('xlink:href');
      if (href && href.startsWith('http://')) {
        el.remove();
      }
    }
  });

  return new XMLSerializer().serializeToString(svg);
}

// Validate color input
export function sanitizeColorInput(color: string): string | null {
  // Only allow hex colors
  if (!/^#[0-9a-f]{6}$/i.test(color)) {
    return null;
  }
  return color;
}

// Sanitize label text (for data-label attribute)
export function sanitizeLabelText(label: string): string {
  // Remove dangerous characters and limit length
  return label.replace(/[<>"&]/g, '').slice(0, 100);
}
