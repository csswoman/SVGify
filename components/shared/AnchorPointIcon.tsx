import type { SVGProps } from 'react';

/**
 * The SVGify brand mark: an anchor point with two bezier handles.
 * Used in exactly three places — header logo, split-view handle,
 * active-tool indicator in the left rail. Do not use elsewhere.
 */
export function AnchorPointIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      aria-hidden="true"
      {...props}
    >
      {/* handle lines, diagonal from center square to opposite corners */}
      <line x1="12" y1="12" x2="5" y2="5" />
      <line x1="12" y1="12" x2="19" y2="19" />
      {/* center anchor: filled square */}
      <rect x="10" y="10" width="4" height="4" fill="currentColor" stroke="none" />
      {/* handle endpoints: hollow circles */}
      <circle cx="5" cy="5" r="2" fill="none" />
      <circle cx="19" cy="19" r="2" fill="none" />
    </svg>
  );
}
