'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathLabels } from '@/hooks/usePathLabels';
import { useSvgSelection } from '@/hooks/useSvgSelection';
import type { WorkspaceTool } from '@/types/workspace.types';
import type { useWorkspaceSvg } from '@/hooks/useWorkspaceSvg';

function escapeSelectorValue(value: string): string {
  return typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
    ? CSS.escape(value)
    : value.replace(/["\\]/g, '\\$&');
}

export function useWorkspaceLabels(
  editor: ReturnType<typeof useWorkspaceSvg>,
  activeTool: WorkspaceTool
) {
  const [editingPath, setEditingPath] = useState<SVGPathElement | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const editingPathRestoreRef = useRef<{
    path: SVGPathElement;
    stroke: string;
    strokeWidth: string;
    vectorEffect: string;
  } | null>(null);
  const isLabelMode = activeTool === 'labels';

  const { labels, extractLabels, addLabel } = usePathLabels(editor.svgEl);
  const { selectPath, selectPaths, clearSelection } = useSvgSelection();

  const restoreEditingPathHighlight = useCallback(() => {
    const previous = editingPathRestoreRef.current;
    if (!previous) return;
    previous.path.style.stroke = previous.stroke;
    previous.path.style.strokeWidth = previous.strokeWidth;
    previous.path.style.vectorEffect = previous.vectorEffect;
    previous.path.removeAttribute('data-svgcraft-label-editing');
    editingPathRestoreRef.current = null;
  }, []);

  const selectEditingPath = useCallback(
    (path: SVGPathElement | null) => {
      restoreEditingPathHighlight();

      if (path) {
        editingPathRestoreRef.current = {
          path,
          stroke: path.style.stroke,
          strokeWidth: path.style.strokeWidth,
          vectorEffect: path.style.vectorEffect,
        };
        path.setAttribute('data-svgcraft-label-editing', 'true');
        path.style.stroke = '#2563eb';
        path.style.strokeWidth = '3';
        path.style.vectorEffect = 'non-scaling-stroke';
      }

      setEditingPath(path);
    },
    [restoreEditingPathHighlight]
  );

  useEffect(() => {
    if (editor.svgEl) extractLabels();
  }, [editor.svgEl, extractLabels]);

  useEffect(() => {
    if (!isLabelMode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- leaving label mode clears transient editor selection
      selectEditingPath(null);
      clearSelection();
    }
  }, [isLabelMode, clearSelection, selectEditingPath]);

  const handleLabelSave = useCallback(
    (label: string) => {
      if (!editingPath) return;
      addLabel(editingPath, label);
      selectEditingPath(null);
      clearSelection();
      editor.pushSnapshot();
    },
    [editingPath, addLabel, clearSelection, editor, selectEditingPath]
  );

  const handleLabelClick = useCallback(
    (label: string) => {
      if (!editor.svgEl) return;
      setSelectedLabel(label);
      const escapedLabel = escapeSelectorValue(label);
      const paths = Array.from(new Set(
        editor.svgEl.querySelectorAll<SVGPathElement>(
          `path[data-label="${escapedLabel}"], g[data-label="${escapedLabel}"] path`
        )
      ));
      if (paths.length === 1) selectPath(paths[0], `label-${label}`);
      else if (paths.length > 1) selectPaths(paths, `label-${label}`);
    },
    [editor.svgEl, selectPath, selectPaths]
  );

  return {
    labels,
    editingPath,
    setEditingPath: selectEditingPath,
    selectedLabel,
    handleLabelSave,
    handleLabelClick,
    clearSelection,
    isLabelMode,
  };
}
