import { parseRgbString, rgbToHex } from './colorUtils';
import type { RGBColor } from '@/types/svg.types';
import type { WorkspaceTool } from '@/types/workspace.types';

export type CanvasStatusEvent = 'colorPicked' | 'fillReplaced';

export interface PathClickContext {
  fillColor: RGBColor;
  selectedColor: RGBColor | null;
  setSelectedColor: (color: RGBColor | null) => void;
  setSelectedPath: (path: SVGPathElement | null) => void;
  setEditingLabelPath: (path: SVGPathElement | null) => void;
  replaceColor: (from: RGBColor, to: RGBColor) => void;
  removePath: (path: SVGPathElement) => void;
  pushSnapshot: () => void;
  onStatusMessage?: (event: CanvasStatusEvent, detail?: string) => void;
}

export function parsePathFill(path: SVGPathElement): RGBColor | null {
  const fill = path.getAttribute('fill');
  if (!fill || fill === 'none') return null;
  return parseRgbString(fill);
}

export function routePathClick(
  activeTool: WorkspaceTool,
  path: SVGPathElement,
  ctx: PathClickContext
): void {
  const color = parsePathFill(path);
  if (!color) return;

  switch (activeTool) {
    case 'eyedropper':
      ctx.setSelectedColor(color);
      ctx.onStatusMessage?.('colorPicked', rgbToHex(color));
      break;
    case 'fill':
      if (rgbToHex(color) !== rgbToHex(ctx.fillColor)) {
        ctx.replaceColor(color, ctx.fillColor);
        ctx.pushSnapshot();
        ctx.onStatusMessage?.('fillReplaced');
      }
      break;
    case 'erase':
      ctx.removePath(path);
      ctx.pushSnapshot();
      break;
    case 'nodes':
      ctx.setSelectedPath(path);
      break;
    case 'labels':
      ctx.setEditingLabelPath(path);
      break;
    default:
      break;
  }
}

export function routeBackgroundClick(
  activeTool: WorkspaceTool,
  ctx: Pick<PathClickContext, 'setSelectedColor' | 'setSelectedPath' | 'setEditingLabelPath'>
): void {
  switch (activeTool) {
    case 'eyedropper':
      ctx.setSelectedColor(null);
      break;
    case 'nodes':
      ctx.setSelectedPath(null);
      break;
    case 'labels':
      ctx.setEditingLabelPath(null);
      break;
    default:
      break;
  }
}

const TOOL_CURSORS: Partial<Record<WorkspaceTool, string>> = {
  eyedropper: 'crosshair',
  fill: 'cell',
  erase: 'pointer',
  brush: 'crosshair',
  nodes: 'pointer',
  labels: 'crosshair',
};

export function getToolCursor(activeTool: WorkspaceTool): string {
  return TOOL_CURSORS[activeTool] ?? 'default';
}

export function resolvePathFromEvent(
  target: EventTarget | null,
  container: HTMLElement | null
): SVGPathElement | null {
  if (!(target instanceof Element) || !container) return null;
  const path = target.closest('path');
  if (!path || !container.contains(path)) return null;
  return path as SVGPathElement;
}
