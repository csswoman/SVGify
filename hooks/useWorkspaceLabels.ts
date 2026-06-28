'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathLabels } from '@/hooks/usePathLabels';
import { useSvgSelection } from '@/hooks/useSvgSelection';
import type { WorkspaceTool } from '@/types/workspace.types';
import type { useWorkspaceSvg } from '@/hooks/useWorkspaceSvg';

export function useWorkspaceLabels(
  editor: ReturnType<typeof useWorkspaceSvg>,
  activeTool: WorkspaceTool
) {
  const [editingPath, setEditingPath] = useState<SVGPathElement | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const isLabelMode = activeTool === 'labels';

  const { labels, extractLabels, addLabel } = usePathLabels(editor.svgEl);
  const { selectPath, selectPaths, clearSelection } = useSvgSelection();

  useEffect(() => {
    if (editor.svgEl) extractLabels();
  }, [editor.svgEl, extractLabels]);

  useEffect(() => {
    if (!isLabelMode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- leaving label mode clears transient editor selection
      setEditingPath(null);
      clearSelection();
    }
  }, [isLabelMode, clearSelection]);

  const handleLabelSave = useCallback(
    (label: string) => {
      if (!editingPath) return;
      addLabel(editingPath, label);
      setEditingPath(null);
      clearSelection();
      editor.pushSnapshot();
    },
    [editingPath, addLabel, clearSelection, editor]
  );

  const handleLabelClick = useCallback(
    (label: string) => {
      if (!editor.svgEl) return;
      setSelectedLabel(label);
      const paths = Array.from(
        editor.svgEl.querySelectorAll<SVGPathElement>(`path[data-label="${label}"]`)
      );
      if (paths.length === 1) selectPath(paths[0], `label-${label}`);
      else if (paths.length > 1) selectPaths(paths, `label-${label}`);
    },
    [editor.svgEl, selectPath, selectPaths]
  );

  return {
    labels,
    editingPath,
    setEditingPath,
    selectedLabel,
    handleLabelSave,
    handleLabelClick,
    clearSelection,
    isLabelMode,
  };
}
