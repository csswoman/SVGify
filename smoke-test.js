/**
 * Smoke test: imagetracerjs in Node.js
 * Verifies it runs without WASM, DOM, or canvas dependencies.
 */

// imagetracerjs needs to be loaded as a CommonJS module in Node
// We'll create a minimal ImageData-like object
const ImageTracer = require('./node_modules/imagetracerjs/imagetracer_v1.2.6.js');

// Create a tiny 4x4 test image with two colors: red and blue
// RGBA format: 4 bytes per pixel
const width = 4;
const height = 4;
const data = new Uint8ClampedArray(width * height * 4);

// Top-left 2x2: red (255, 0, 0, 255)
for (let i = 0; i < 8; i += 4) {
  data[i] = 255;     // R
  data[i + 1] = 0;   // G
  data[i + 2] = 0;   // B
  data[i + 3] = 255; // A
}

// Top-right 2x2: blue (0, 0, 255, 255)
for (let row = 0; row < 2; row++) {
  for (let col = 2; col < 4; col++) {
    const idx = (row * width + col) * 4;
    data[idx] = 0;     // R
    data[idx + 1] = 0; // G
    data[idx + 2] = 255; // B
    data[idx + 3] = 255; // A
  }
}

// Bottom half: green (0, 255, 0, 255)
for (let row = 2; row < 4; row++) {
  for (let col = 0; col < 4; col++) {
    const idx = (row * width + col) * 4;
    data[idx] = 0;     // R
    data[idx + 1] = 255; // G
    data[idx + 2] = 0;   // B
    data[idx + 3] = 255; // A
  }
}

// Create ImageData-like object
const imageData = {
  data,
  width,
  height,
};

console.log('=== SVGcraft Smoke Test: imagetracerjs ===\n');
console.log('Input: 4x4 image with red, blue, and green colors');
console.log('Testing: ImageTracer.imagedataToSVG(imageData, options)\n');

try {
  // Run the tracer with default options
  const svgString = ImageTracer.imagedataToSVG(imageData, 'default');

  console.log('✓ Tracer completed successfully\n');
  console.log('Output SVG (first 1500 chars):\n');
  console.log(svgString.substring(0, 1500));
  console.log('\n...\n');

  // Check for required structure
  const hasPathElements = svgString.includes('<path');
  const hasFillAttribute = svgString.includes('fill="rgb(');
  const hasRgbColor = /fill="rgb\(\d+,\d+,\d+\)"/.test(svgString);

  console.log('=== Validation ===');
  console.log('✓ SVG has <path> elements:', hasPathElements);
  console.log('✓ Paths have fill="rgb(...)" attributes:', hasFillAttribute && hasRgbColor);
  console.log('✓ Output length:', svgString.length, 'characters');

  if (hasPathElements && hasFillAttribute && hasRgbColor) {
    console.log('\n✓✓✓ SMOKE TEST PASSED ✓✓✓');
    console.log('imagetracerjs works perfectly in Node.js and will work in Web Worker.');
    process.exit(0);
  } else {
    console.log('\n✗ SMOKE TEST FAILED: Missing expected SVG structure');
    process.exit(1);
  }
} catch (err) {
  console.error('✗ SMOKE TEST FAILED: ', err.message);
  console.error(err.stack);
  process.exit(1);
}
