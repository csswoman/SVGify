'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { sanitizeSvgString } from '@/lib/sanitize';
import { serializeSvgElement } from '@/lib/serializeSvg';
import { NodeEditor } from './NodeEditor';
import { BrushEditor } from './BrushEditor';
import { PathList, type PathItem } from './PathList';
import { Tooltip } from '@/components/shared/Tooltip';
import { ZoomableSvgViewport } from '@/components/shared/ZoomableSvgViewport';
import { useSvgZoom } from '@/hooks/useSvgZoom';
import { useI18n } from '@/lib/i18n';
import type { SvgZoomViewport } from '@/types/svg.types';

interface ShapeEditStepProps {
  svgString: string;
  zoomViewport: SvgZoomViewport;
  onZoomViewportChange: (viewport: SvgZoomViewport) => void;
  onComplete: (svgString: string) => void;
}

type Mode = 'nodes' | 'brush' | 'delete';
type PreviewBackground = 'checkerboard' | 'black';

const CHECKERBOARD_BG: React.CSSProperties = {
  backgroundImage: 'repeating-conic-gradient(#f3f4f6 0% 25%, #ffffff 0% 50%)',
  backgroundSize: '16px 16px',
};

const BLACK_BG: React.CSSProperties = {
  backgroundColor: '#000000',
};

export function ShapeEditStep({
  svgString,
  zoomViewport,
  onZoomViewportChange,
  onComplete,
}: ShapeEditStepProps) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgEl, setSvgEl] = useState<SVGSVGElement | null>(null);
  const [mode, setMode] = useState<Mode>('nodes');
  const [selectedPath, setSelectedPath] = useState<SVGPathElement | null>(null);
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(6);
  const [pathItems, setPathItems] = useState<PathItem[]>([]);
  const [previewBackground, setPreviewBackground] = useState<PreviewBackground>('checkerboard');

  const zoom = useSvgZoom({ viewport: zoomViewport, onViewportChange: onZoomViewportChange });
  const attachZoom = zoom.attach;
  const getBaseViewBox = zoom.getBaseViewBox;
  const serializeMountedSvg = zoom.serializeMountedSvg;

  // Undo/redo snapshots of the whole SVG.
  const [history, setHistory] = useState<string[]>([]);
  const [index, setIndex] = useState(-1);

  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // Build the path list from the live SVG.
  const refreshPathItems = useCallback((svg: SVGSVGElement) => {
    const items: PathItem[] = [];
    svg.querySelectorAll('path').forEach((el, i) => {
      items.push({ el, id: i, fill: el.getAttribute('fill') || '#000000' });
    });
    setPathItems(items);
  }, []);

  const snapshotRef = useRef<() => void>(undefined);

  const mountSvg = useCallback(
    (source: string): SVGSVGElement | null => {
      const container = containerRef.current;
      if (!container) return null;
      const doc = new DOMParser().parseFromString(sanitizeSvgString(source), 'image/svg+xml');
      if (doc.documentElement.tagName === 'parsererror') return null;
      const svg = doc.documentElement as unknown as SVGSVGElement;
      if (!svg.getAttribute('viewBox')) {
        const w = svg.getAttribute('width');
        const h = svg.getAttribute('height');
        if (w && h) svg.setAttribute('viewBox', `0 0 ${parseFloat(w)} ${parseFloat(h)}`);
      }
      svg.removeAttribute('width');
      svg.removeAttribute('height');
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      svg.style.width = '100%';
      svg.style.height = '100%';
      svg.style.display = 'block';

      svg.querySelectorAll('[data-svgcraft-editor]').forEach((el) => el.remove());

      svg.querySelectorAll('path').forEach((p) => {
        p.style.cursor = 'pointer';
        p.addEventListener('click', () => {
          if (modeRef.current === 'nodes') {
            setSelectedPath(p);
          } else if (modeRef.current === 'delete') {
            p.remove();
            refreshPathItems(svg);
            snapshotRef.current?.();
          }
        });
      });

      container.replaceChildren(svg);
      setSvgEl(svg);
      setSelectedPath(null);
      attachZoom(svg);
      refreshPathItems(svg);
      return svg;
    },
    [attachZoom, refreshPathItems]
  );

  const snapshot = useCallback(() => {
    const svg = containerRef.current?.querySelector('svg');
    if (!svg) return;
    const base = getBaseViewBox();
    const s = serializeSvgElement(svg as SVGSVGElement, base ?? undefined);
    setHistory((prev) => [...prev.slice(0, index + 1), s]);
    setIndex((i) => i + 1);
  }, [index, getBaseViewBox]);
  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  // Initial mount.
  useEffect(() => {
    if (!svgString) return;
    mountSvg(svgString);
    /* eslint-disable react-hooks/set-state-in-effect -- imperative mount seeds history */
    setHistory([svgString]);
    setIndex(0);
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svgString]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedPath(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const restore = useCallback(
    (i: number) => {
      const snap = history[i];
      if (snap === undefined) return;
      mountSvg(snap);
      setIndex(i);
    },
    [history, mountSvg]
  );

  const canUndo = index > 0;
  const canRedo = index < history.length - 1;

  // Hover highlight from the path list.
  const handleHover = useCallback((el: SVGPathElement | null) => {
    // Clear any previous highlight.
    const svg = containerRef.current?.querySelector('svg');
    svg?.querySelectorAll('path[data-hl]').forEach((p) => {
      (p as SVGPathElement).style.outline = '';
      (p as SVGPathElement).style.opacity = '';
      p.removeAttribute('data-hl');
    });
    if (el) {
      el.style.opacity = '0.4';
      el.setAttribute('data-hl', '1');
    }
  }, []);

  const handleDeleteItem = useCallback(
    (item: PathItem) => {
      item.el.remove();
      const svg = containerRef.current?.querySelector('svg');
      if (svg) refreshPathItems(svg);
      snapshot();
    },
    [refreshPathItems, snapshot]
  );

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (mode !== 'nodes' || !selectedPath) return;
    const target = e.target as Element;
    if (target.tagName === 'svg' || target === containerRef.current) {
      setSelectedPath(null);
    }
  };

  const handleContinue = () => {
    handleHover(null);
    setSelectedPath(null);
    const exported = serializeMountedSvg();
    if (exported) onComplete(exported);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">{t('shape.title')}</h1>
        <p className="text-gray-500 dark:text-gray-400">
          {mode === 'nodes'
            ? t('shape.nodesSub')
            : mode === 'brush'
              ? t('shape.brushSub')
              : t('shape.deleteSub')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              {t('shape.previewBg')}
            </span>
            <div className="flex gap-1 rounded-lg border border-gray-200 dark:border-gray-700 p-0.5 bg-gray-50 dark:bg-gray-900">
              {(['checkerboard', 'black'] as PreviewBackground[]).map((bg) => (
                <button
                  key={bg}
                  type="button"
                  onClick={() => setPreviewBackground(bg)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                    previewBackground === bg
                      ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                  aria-pressed={previewBackground === bg}
                >
                  {bg === 'checkerboard' ? t('shape.bgCheckerboard') : t('shape.bgBlack')}
                </button>
              ))}
            </div>
          </div>
          <ZoomableSvgViewport
            containerRef={containerRef}
            zoom={zoom}
            onClick={handleCanvasClick}
            className="w-full min-h-72 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden flex items-center justify-center"
            style={previewBackground === 'black' ? BLACK_BG : CHECKERBOARD_BG}
            aria-label="Shape editor"
          />
          {svgEl &&
            mode === 'nodes' &&
            selectedPath &&
            createPortal(
              <NodeEditor pathEl={selectedPath} svgEl={svgEl} onChange={snapshot} />,
              svgEl
            )}
          {svgEl &&
            mode === 'brush' &&
            createPortal(
              <BrushEditor svgEl={svgEl} color={brushColor} size={brushSize} onChange={snapshot} />,
              svgEl
            )}
        </div>

        <div className="space-y-6">
          {/* Undo / redo */}
          <div className="flex gap-2">
            <button
              onClick={() => restore(index - 1)}
              disabled={!canUndo}
              className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-900 dark:text-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 transition"
            >
              ↶ {t('col.undo')}
            </button>
            <button
              onClick={() => restore(index + 1)}
              disabled={!canRedo}
              className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-900 dark:text-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 transition"
            >
              ↷ {t('col.redo')}
            </button>
          </div>

          {/* Mode switch */}
          <div className="grid grid-cols-3 gap-2">
            {(['nodes', 'brush', 'delete'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setSelectedPath(null);
                }}
                className={`px-2 py-2 rounded-lg text-xs font-semibold transition ${
                  mode === m ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {m === 'nodes' ? t('shape.modeNodes') : m === 'brush' ? t('shape.modeBrush') : t('shape.modeDelete')}
              </button>
            ))}
          </div>

          {mode === 'nodes' && (
            <div className="space-y-2">
              <p className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                {selectedPath ? t('shape.nodesActive') : t('shape.nodesHint')}
                <Tooltip text={t('shape.nodes.help')} label={t('shape.modeNodes')} />
              </p>
              {selectedPath && (
                <button
                  type="button"
                  onClick={() => setSelectedPath(null)}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-900 dark:text-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                >
                  {t('shape.deselect')}
                </button>
              )}
            </div>
          )}

          {mode === 'brush' && (
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t('shape.brushColor')}
                <input
                  type="color"
                  value={brushColor}
                  onChange={(e) => setBrushColor(e.target.value)}
                  className="h-8 w-12 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                />
                <Tooltip text={t('shape.brush.help')} label={t('shape.modeBrush')} />
              </label>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {t('shape.brushSize')}: <span className="font-mono">{brushSize}</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={40}
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>
            </div>
          )}

          {/* Figma-style path list — always available */}
          <div className="space-y-2">
            <p className="flex items-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {t('shape.shapes')} ({pathItems.length})
              <Tooltip text={t('shape.list.help')} label={t('shape.shapes')} />
            </p>
            <PathList items={pathItems} onHover={handleHover} onDelete={handleDeleteItem} />
          </div>

          <button
            onClick={handleContinue}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            {t('shape.continue')}
          </button>
        </div>
      </div>
    </div>
  );
}
