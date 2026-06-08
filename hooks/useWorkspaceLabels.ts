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
  const { selectPath, clearSelection } = useSvgSelection();

  useEffect(() => {
    if (editor.svgEl) extractLabels();
  }, [editor.svgEl, extractLabels]);

  useEffect(() => {
    if (!isLabelMode) {
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
    [editingPath, addLabel, clearSelection, editor.pushSnapshot]
  );

  const handleLabelClick = useCallback(
    (label: string) => {
      if (!editor.svgEl) return;
      setSelectedLabel(label);
      const path = editor.svgEl.querySelector<SVGPathElement>(`path[data-label="${label}"]`);
      if (path) selectPath(path, `label-${label}`);
    },
    [editor.svgEl, selectPath]
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
