import { ImageResponse } from 'next/og';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 64,
          background:
            'linear-gradient(135deg, #0f172a 0%, #134e4a 48%, #16a34a 100%)',
          color: '#ecfdf5',
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              fontSize: 34,
              fontWeight: 700,
              letterSpacing: '-0.03em',
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 18,
                background: 'rgba(255,255,255,0.14)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 30,
                lineHeight: 1,
              }}
            >
              SVG
            </div>
            SVGify
          </div>
          <div
            style={{
              fontSize: 18,
              opacity: 0.9,
              padding: '10px 16px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.12)',
            }}
          >
            Local. Fast. Private.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 22,
            maxWidth: 860,
          }}
        >
          <div
            style={{
              fontSize: 74,
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: '-0.05em',
            }}
          >
            Trace images into SVG in your browser.
          </div>
          <div
            style={{
              fontSize: 28,
              lineHeight: 1.35,
              color: 'rgba(236,253,245,0.88)',
              maxWidth: 760,
            }}
          >
            Upload a raster image, refine colors and shapes, and export a clean
            SVG without sending files to a server.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 16,
            fontSize: 20,
            color: 'rgba(236,253,245,0.92)',
          }}
        >
          <span
            style={{
              padding: '12px 18px',
              borderRadius: 999,
              background: 'rgba(15,23,42,0.35)',
              border: '1px solid rgba(255,255,255,0.14)',
            }}
          >
            Vectorize
          </span>
          <span
            style={{
              padding: '12px 18px',
              borderRadius: 999,
              background: 'rgba(15,23,42,0.35)',
              border: '1px solid rgba(255,255,255,0.14)',
            }}
          >
            Edit colors
          </span>
          <span
            style={{
              padding: '12px 18px',
              borderRadius: 999,
              background: 'rgba(15,23,42,0.35)',
              border: '1px solid rgba(255,255,255,0.14)',
            }}
          >
            Download SVG
          </span>
        </div>
      </div>
    ),
    size,
  );
}
