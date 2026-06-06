'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathLabels } from '@/hooks/usePathLabels';
import { useSvgSelection } from '@/hooks/useSvgSelection';
import { sanitizeSvgString } from '@/lib/sanitize';
import { LabelSidebar } from './LabelSidebar';
import { LabelInput } from './LabelInput';
import { DownloadButton } from '@/components/shared/DownloadButton';

interface LabelStepProps {
  svgString: string;
  onComplete: (svgString: string) => void;
}

export function LabelStep({ svgString, onComplete }: LabelStepProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgEl, setSvgEl] = useState<SVGElement | null>(null);
  const [isLabelMode, setIsLabelMode] = useState(false);
  const [editingPath, setEditingPath] = useState<SVGPathElement | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  const { labels, extractLabels, addLabel } = usePathLabels(svgEl);
  const { selectedPathEl, selectPath, clearSelection } = useSvgSelection();

  // Mount SVG once
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !svgString) return;

    try {
      const sanitized = sanitizeSvgString(svgString);
      const parser = new DOMParser();
      const doc = parser.parseFromString(sanitized, 'image/svg+xml');

      if (doc.documentElement.tagName === 'parsererror') throw new Error('Invalid SVG');

      const svg = doc.documentElement as SVGElement;
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      svg.style.maxWidth = '100%';

      container.replaceChildren(svg);
      setSvgEl(svg);
    } catch (err) {
      console.error('LabelStep: failed to mount SVG', err);
    }
  }, [svgString]);

  // Extract labels after mount
  useEffect(() => {
    if (svgEl) extractLabels();
  }, [svgEl, extractLabels]);

  // Wire up click handlers whenever label mode or svgEl changes
  useEffect(() => {
    if (!svgEl) return;

    let pathIndex = 0;
    const handlers: Array<{ el: SVGPathElement; fn: () => void }> = [];

    svgEl.querySelectorAll('path').forEach((path) => {
      const idx = pathIndex++;
      const fn = () => {
        if (!isLabelMode) return;
        selectPath(path, `path-${idx}`);
        setEditingPath(path);
        setSelectedLabel(null);
      };
      path.style.cursor = isLabelMode ? 'crosshair' : 'default';
      path.addEventListener('click', fn);
      handlers.push({ el: path, fn });
    });

    return () => {
      handlers.forEach(({ el, fn }) => el.removeEventListener('click', fn));
    };
  }, [svgEl, isLabelMode, selectPath]);

  const handleLabelSave = useCallback(
    (label: string) => {
      if (!editingPath) return;
      addLabel(editingPath, label);
      setEditingPath(null);
      clearSelection();
    },
    [editingPath, addLabel, clearSelection]
  );

  const handleLabelClick = useCallback(
    (label: string) => {
      if (!svgEl) return;
      setSelectedLabel(label);
      const path = svgEl.querySelector<SVGPathElement>(`path[data-label="${label}"]`);
      if (path) selectPath(path, `label-${label}`);
    },
    [svgEl, selectPath]
  );

  const handleComplete = () => {
    if (!svgEl) return;
    const serialized = new XMLSerializer().serializeToString(svgEl);
    onComplete(serialized);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Label Shapes</h1>
        <p className="text-gray-500">
          Enable Label Mode, click a path, and give it a name. Labels are saved in the SVG file.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => {
            setIsLabelMode((v) => !v);
            setEditingPath(null);
            clearSelection();
          }}
          className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition ${
            isLabelMode
              ? 'bg-blue-600 text-white ring-2 ring-blue-300'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
          aria-pressed={isLabelMode}
        >
          {isLabelMode ? '✓ Label Mode ON' : 'Enable Label Mode'}
        </button>
        {isLabelMode && (
          <p className="text-sm text-blue-700">Click any path in the preview to label it.</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* SVG preview */}
        <div className="lg:col-span-2">
          <div
            ref={containerRef}
            className="w-full min-h-72 border border-gray-200 rounded-lg bg-white overflow-hidden flex items-center justify-center"
            aria-label="SVG label editor"
          />
        </div>

        {/* Sidebar controls */}
        <div className="space-y-6">
          {editingPath && isLabelMode ? (
            <LabelInput
              currentLabel={editingPath.getAttribute('data-label')}
              onSave={handleLabelSave}
              onCancel={() => {
                setEditingPath(null);
                clearSelection();
              }}
            />
          ) : (
            <LabelSidebar
              labels={labels}
              onLabelClick={handleLabelClick}
              selectedLabel={selectedLabel}
            />
          )}

          <div className="flex flex-col gap-3">
            <DownloadButton svgString={svgString} labels={labels} fileName="labeled.svg" />
            <button
              onClick={handleComplete}
              className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
            >
              Finish &amp; Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
