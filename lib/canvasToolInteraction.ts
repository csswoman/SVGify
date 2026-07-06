import { hexToRgb, parseRgbString, rgbToHex } from './colorUtils';
import type { RGBColor } from '@/types/svg.types';
import type { WorkspaceTool } from '@/types/workspace.types';

export type CanvasStatusEvent = 'colorPicked' | 'fillPainted';

export interface PathClickContext {
  fillColor: RGBColor;
  selectedColor: RGBColor | null;
  setSelectedColor: (color: RGBColor | null) => void;
  setFillColor: (color: RGBColor) => void;
  setSelectedPath: (path: SVGPathElement | null) => void;
  setEditingLabelPath: (path: SVGPathElement | null) => void;
  replacePathColor: (path: SVGPathElement, newColor: RGBColor, previousColor: RGBColor) => void;
  removePath: (path: SVGPathElement) => void;
  erasePathArea: (path: SVGPathElement, clientX: number, clientY: number) => void;
  pushSnapshot: () => void;
  onToolChange?: (tool: WorkspaceTool) => void;
  onStatusMessage?: (event: CanvasStatusEvent, detail?: string) => void;
}

export function parsePathFill(path: SVGPathElement): RGBColor | null {
  const fill = path.getAttribute('fill');
  if (!fill || fill === 'none') return null;
  return parseRgbString(fill) ?? hexToRgb(fill);
}

export function routePathClick(
  activeTool: WorkspaceTool,
  path: SVGPathElement,
  ctx: PathClickContext,
  point?: { clientX: number; clientY: number }
): void {
  const color = parsePathFill(path);
  if (!color) return;

  switch (activeTool) {
    case 'eyedropper':
      ctx.setSelectedColor(color);
      ctx.setFillColor(color);
      ctx.onStatusMessage?.('colorPicked', rgbToHex(color));
      ctx.onToolChange?.('fill');
      break;
    case 'fill':
      if (rgbToHex(color) !== rgbToHex(ctx.fillColor)) {
        ctx.replacePathColor(path, ctx.fillColor, color);
        ctx.pushSnapshot();
        ctx.onStatusMessage?.('fillPainted');
      }
      break;
    case 'erasePath':
      if (point) {
        ctx.erasePathArea(path, point.clientX, point.clientY);
      } else {
        ctx.removePath(path);
      }
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
  erase: 'crosshair',
  erasePath: 'pointer',
  brush: 'crosshair',
  nodes: 'pointer',
  labels: 'crosshair',
};

export function getToolCursor(activeTool: WorkspaceTool): string {
  return TOOL_CURSORS[activeTool] ?? 'default';
}

export function resolvePathFromEvent(
  target: EventTarget | null,
  container: HTMLElement | null,
  point?: { clientX: number; clientY: number }
): SVGPathElement | null {
  if (!(target instanceof Element) || !container) return null;

  if (point && typeof document.elementsFromPoint === 'function') {
    const paths = document
      .elementsFromPoint(point.clientX, point.clientY)
      .filter((el): el is SVGPathElement => el instanceof SVGPathElement && container.contains(el));

    if (paths.length > 0) {
      return paths.sort((a, b) => pathHitArea(a) - pathHitArea(b))[0];
    }
  }

  const path = target.closest('path');
  if (!path || !container.contains(path)) return null;
  return path as SVGPathElement;
}

function pathHitArea(path: SVGPathElement): number {
  try {
    const box = path.getBBox();
    return Math.max(0, box.width) * Math.max(0, box.height);
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}
