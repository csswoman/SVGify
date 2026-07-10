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
  switch (activeTool) {
    case 'nodes':
      ctx.setSelectedPath(path);
      return;
    case 'labels':
      ctx.setEditingLabelPath(path);
      return;
    case 'erasePath':
      if (point) {
        ctx.erasePathArea(path, point.clientX, point.clientY);
      } else {
        ctx.removePath(path);
      }
      return;
    default:
      break;
  }

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

  // Trust the event target first.  `elementsFromPoint` includes every shape
  // below the pointer; choosing the smallest of those paths made clicks on a
  // large background shape select a smaller, overlapping detail instead.
  const directPath = target.closest('path');
  if (directPath && container.contains(directPath)) {
    return directPath as SVGPathElement;
  }

  if (point && typeof document.elementsFromPoint === 'function') {
    const path = document
      .elementsFromPoint(point.clientX, point.clientY)
      .find(
        (el): el is SVGPathElement =>
          el instanceof SVGPathElement &&
          container.contains(el) &&
          !el.closest('[data-svgcraft-editor]')
      );

    // The browser returns this list from front to back, so the first path is
    // the visible figure the user intended to select.
    if (path) {
      return path;
    }
  }

  return null;
}
