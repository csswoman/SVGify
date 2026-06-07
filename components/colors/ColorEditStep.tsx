'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { RGBColor } from '@/types/svg.types';
import { useSvgColors } from '@/hooks/useSvgColors';
import { sanitizeSvgString } from '@/lib/sanitize';
import { parseRgbString, extractPaletteFromSvgString, rgbToHex } from '@/lib/colorUtils';
import { ColorSwatches } from './ColorSwatches';
import { ColorPicker } from './ColorPicker';
import { Tooltip } from '@/components/shared/Tooltip';
import { ZoomControls } from '@/components/shared/ZoomControls';
import { useSvgZoom } from '@/hooks/useSvgZoom';
import { useI18n } from '@/lib/i18n';

interface ColorEditStepProps {
  svgString: string;
  onColorsEdited: (svgString: string) => void;
}

export function ColorEditStep({ svgString, onColorsEdited }: ColorEditStepProps) {
  const { t } = useI18n();
  const zoom = useSvgZoom();
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgEl, setSvgEl] = useState<SVGElement | null>(null);
  const [selectedColor, setSelectedColor] = useState<RGBColor | null>(null);
  const [eraseMode, setEraseMode] = useState(false);

  // Before/after compare: when true the preview shows the original SVG.
  const [showOriginal, setShowOriginal] = useState(false);

  // The original palette captured on entry — colors you can always reapply.
  const [originalPalette, setOriginalPalette] = useState<RGBColor[]>([]);
  // Whether the "Original colors" reference row is visible.
  const [showOriginalPalette, setShowOriginalPalette] = useState(false);
  // Undo/redo: serialized SVG snapshots. `index` points at the current state.
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const historyRef = useRef(history);
  useEffect(() => {
    historyRef.current = history;
  }, [history]);
  const historyIndexRef = useRef(historyIndex);
  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  const { colors, extractColors, replaceColor, deleteColor, snapDarksToBlack, normalizePalette } =
    useSvgColors(svgEl);
  const [targetCount, setTargetCount] = useState(6);

  // Mounts an SVG string into the container, wiring path-click handlers, and
  // publishes the live element. Used on first load and on undo/redo restore.
  const mountSvg = useCallback(
    (sourceSvg: string): SVGElement | null => {
      const container = containerRef.current;
      if (!container) return null;

      const sanitized = sanitizeSvgString(sourceSvg);
      const doc = new DOMParser().parseFromString(sanitized, 'image/svg+xml');
      if (doc.documentElement.tagName === 'parsererror') return null;

      const svg = doc.documentElement as unknown as SVGElement;
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
      svg.style.maxHeight = '100%';
      svg.style.display = 'block';

      svg.querySelectorAll('path').forEach((path) => {
        path.style.cursor = 'pointer';
      });

      container.replaceChildren(svg);
      setSvgEl(svg);
      zoom.attach(svg as unknown as SVGSVGElement);
      return svg;
    },
    [zoom]
  );

  // Push the current SVG state onto the history (truncating any redo branch).
  const pushSnapshot = useCallback(() => {
    const svg = containerRef.current?.querySelector('svg');
    if (!svg) return;
    const snapshot = new XMLSerializer().serializeToString(svg);
    if (snapshot === historyRef.current[historyIndexRef.current]) return;
    const nextIndex = historyIndexRef.current + 1;
    setHistory((prev) => {
      const base = prev.slice(0, historyIndexRef.current + 1);
      const next = [...base, snapshot];
      historyRef.current = next;
      return next;
    });
    historyIndexRef.current = nextIndex;
    setHistoryIndex(nextIndex);
  }, []);

  // Initial mount: capture original palette + seed history.
  useEffect(() => {
    if (!svgString) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- imperative mount publishes state after the DOM node is in place
    mountSvg(svgString);
    setOriginalPalette(extractPaletteFromSvgString(svgString));
    setHistory([svgString]);
    historyRef.current = [svgString];
    setHistoryIndex(0);
    historyIndexRef.current = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once per svgString
  }, [svgString]);

  // Extract colors whenever the mounted svg changes.
  useEffect(() => {
    if (svgEl) extractColors();
  }, [svgEl, extractColors]);

  const restore = useCallback(
    (index: number) => {
      const snap = history[index];
      if (snap === undefined) return;
      mountSvg(snap);
      historyIndexRef.current = index;
      setHistoryIndex(index);
      setSelectedColor(null);
    },
    [history, mountSvg]
  );

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleColorPickerChange = useCallback(
    (newColor: RGBColor) => {
      if (!selectedColor) return;
      replaceColor(selectedColor, newColor);
      setSelectedColor(newColor);
      pushSnapshot();
    },
    [selectedColor, replaceColor, pushSnapshot]
  );

  // Reapply an original color: paint the currently selected color back to it,
  // or if none selected, select it for the picker.
  const handleReapplyOriginal = useCallback(
    (color: RGBColor) => {
      if (selectedColor && rgbToHex(selectedColor) !== rgbToHex(color)) {
        replaceColor(selectedColor, color);
        setSelectedColor(color);
        pushSnapshot();
      } else {
        setSelectedColor(color);
      }
    },
    [selectedColor, replaceColor, pushSnapshot]
  );

  const handleDeleteColor = useCallback(
    (color: RGBColor) => {
      deleteColor(color);
      if (selectedColor && rgbToHex(selectedColor) === rgbToHex(color)) {
        setSelectedColor(null);
      }
      pushSnapshot();
    },
    [deleteColor, selectedColor, pushSnapshot]
  );

  const handleSnapBlack = useCallback(() => {
    snapDarksToBlack(72);
    pushSnapshot();
  }, [snapDarksToBlack, pushSnapshot]);

  const handleNormalize = useCallback(() => {
    normalizePalette(targetCount);
    pushSnapshot();
  }, [normalizePalette, targetCount, pushSnapshot]);

  const handleSvgClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (showOriginal) return;
      const target = event.target as Element | null;
      const path = target?.closest('path') as SVGPathElement | null;
      if (!path || !containerRef.current?.contains(path)) return;

      if (eraseMode) {
        path.remove();
        extractColors();
        pushSnapshot();
        setSelectedColor(null);
        return;
      }

      const fill = path.getAttribute('fill');
      if (!fill) return;
      const color = parseRgbString(fill);
      if (color) setSelectedColor(color);
    },
    [eraseMode, extractColors, pushSnapshot, showOriginal]
  );

  // Before/after compare: press and hold to view the original, release to go back.
  // Stashes the current edit while the original is shown (history untouched).
  const editedStashRef = useRef<string | null>(null);
  const showOriginalStart = useCallback(() => {
    if (showOriginal) return;
    const svg = containerRef.current?.querySelector('svg');
    editedStashRef.current = svg ? new XMLSerializer().serializeToString(svg) : null;
    if (history[0] !== undefined) mountSvg(history[0]);
    setShowOriginal(true);
  }, [showOriginal, history, mountSvg]);
  const showOriginalEnd = useCallback(() => {
    if (!showOriginal) return;
    if (editedStashRef.current) mountSvg(editedStashRef.current);
    setShowOriginal(false);
  }, [showOriginal, mountSvg]);

  const handleContinue = () => {
    if (!svgEl) return;
    const edited = new XMLSerializer().serializeToString(svgEl);
    onColorsEdited(edited);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">{t('col.title')}</h1>
        <p className="text-gray-500 dark:text-gray-400">{eraseMode ? t('col.eraseSub') : t('col.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* SVG preview */}
        <div className="lg:col-span-2 space-y-2">
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-semibold uppercase tracking-wide ${
                showOriginal ? 'text-amber-600' : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              {showOriginal ? t('col.showingOriginal') : t('col.showingEdited')}
            </span>
            <button
              onMouseDown={showOriginalStart}
              onMouseUp={showOriginalEnd}
              onMouseLeave={showOriginalEnd}
              onTouchStart={showOriginalStart}
              onTouchEnd={showOriginalEnd}
              className="text-sm px-3 py-1.5 bg-gray-100 dark:bg-gray-900 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition select-none"
            >
              {t('col.holdOriginal')}
            </button>
          </div>
          <div className="relative">
            <div
              ref={containerRef}
              onClick={handleSvgClick}
              onWheel={(e) => {
                e.preventDefault();
                if (e.deltaY < 0) zoom.zoomIn();
                else zoom.zoomOut();
              }}
              className={`transparent-preview w-full min-h-72 border rounded-lg overflow-hidden flex items-center justify-center ${
                showOriginal ? 'border-amber-300' : 'border-gray-200 dark:border-gray-700'
              }`}
              aria-label="SVG color editor"
            />
            <div className="absolute top-2 right-2">
              <ZoomControls
                scale={zoom.scale}
                onZoomIn={zoom.zoomIn}
                onZoomOut={zoom.zoomOut}
                onReset={zoom.reset}
              />
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-6">
          {/* Undo / redo */}
          <div className="flex gap-2">
            <button
              onClick={() => restore(historyIndex - 1)}
              disabled={!canUndo}
              className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-900 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
              aria-label={t('col.undo')}
            >
              ↶ {t('col.undo')}
            </button>
            <button
              onClick={() => restore(historyIndex + 1)}
              disabled={!canRedo}
              className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-900 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
              aria-label={t('col.redo')}
            >
              ↷ {t('col.redo')}
            </button>
          </div>

          <label
            className={`flex items-center gap-2 text-sm font-semibold cursor-pointer rounded-lg px-3 py-2 transition ${
              eraseMode ? 'bg-red-50 text-red-700' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <input
              type="checkbox"
              checked={eraseMode}
              onChange={(e) => setEraseMode(e.target.checked)}
              className="accent-red-600 h-4 w-4"
            />
            {t('col.erase')}
            <Tooltip text={t('col.erase.help')} label={t('col.erase')} />
          </label>

          <div className="space-y-3 border border-gray-100 dark:border-gray-700 rounded-lg p-3">
            <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300">
              {t('col.reduce')}: <span className="font-mono ml-1">{targetCount}</span>
              <Tooltip text={t('col.reduce.help')} label={t('col.reduce')} />
            </label>
            <input
              type="range"
              min={2}
              max={Math.max(2, Math.min(12, colors.length))}
              value={Math.min(targetCount, Math.max(2, Math.min(12, colors.length)))}
              onChange={(e) => setTargetCount(Number(e.target.value))}
              className="w-full accent-blue-600"
              aria-label={`${t('col.reduce')}: ${targetCount}`}
            />
            <button
              onClick={handleNormalize}
              className="w-full px-4 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-1"
            >
              {t('col.normalize')}
              <Tooltip text={t('col.normalize.help')} label={t('col.normalize')} />
            </button>
            <button
              onClick={handleSnapBlack}
              className="w-full px-4 py-2 bg-gray-900 text-white hover:bg-black rounded-lg text-sm font-semibold transition flex items-center justify-center gap-1"
            >
              {t('col.snapBlackBtn')}
              <Tooltip text={t('col.snapBlack.help')} label={t('col.snapBlack')} />
            </button>
          </div>

          <ColorSwatches
            colors={colors}
            onColorClick={setSelectedColor}
            selectedColor={selectedColor}
            onColorDelete={handleDeleteColor}
          />

          {/* Original colors — collapsible reference */}
          {originalPalette.length > 0 && (
            <div className="space-y-2">
              <button
                onClick={() => setShowOriginalPalette((v) => !v)}
                className="flex items-center w-full text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hover:text-gray-700 dark:hover:text-gray-300 transition"
                aria-expanded={showOriginalPalette}
              >
                <span className="mr-1">{showOriginalPalette ? '▾' : '▸'}</span>
                {t('col.originalColors')}
                <Tooltip text={t('col.originalColors.help')} label={t('col.originalColors')} />
              </button>
              {showOriginalPalette && (
                <div className="flex flex-wrap gap-1.5">
                  {originalPalette.map((c) => {
                    const hex = rgbToHex(c);
                    return (
                      <button
                        key={hex}
                        title={hex}
                        onClick={() => handleReapplyOriginal(c)}
                        className="h-7 w-7 rounded border border-gray-200 dark:border-gray-700 shadow-sm hover:ring-2 hover:ring-blue-400 transition"
                        style={{ backgroundColor: hex }}
                        aria-label={`Reapply original color ${hex}`}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {selectedColor && (
            <ColorPicker color={selectedColor} onChange={handleColorPickerChange} onCommit={pushSnapshot} />
          )}

          <button
            onClick={handleContinue}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            {t('col.continue')}
          </button>
        </div>
      </div>
    </div>
  );
}
