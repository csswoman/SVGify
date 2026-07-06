'use client';

import { useEffect } from 'react';
import { isToolEnabled, toolFromKeyboard } from '@/lib/workspaceTools';
import type { WorkspaceDocument, WorkspaceTool } from '@/types/workspace.types';

interface UseWorkspaceShortcutsOptions {
  document: WorkspaceDocument;
  activeTool: WorkspaceTool;
  onToolChange: (tool: WorkspaceTool) => void;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
}

export function useWorkspaceShortcuts({
  document,
  activeTool,
  onToolChange,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onZoomReset,
}: UseWorkspaceShortcutsOptions) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.target instanceof HTMLElement && e.target.isContentEditable) return;

      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        onUndo();
        return;
      }
      if (e.ctrlKey && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        onRedo();
        return;
      }

      if (!e.ctrlKey && !e.metaKey && !e.altKey && document.svgString) {
        if (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd') {
          e.preventDefault();
          onZoomIn?.();
          return;
        }
        if (e.key === '-' || e.code === 'NumpadSubtract') {
          e.preventDefault();
          onZoomOut?.();
          return;
        }
        if (e.key === '0' || e.code === 'Numpad0') {
          e.preventDefault();
          onZoomReset?.();
          return;
        }
      }

      const tool = toolFromKeyboard(e.key);
      if (tool && tool !== activeTool && isToolEnabled(tool, document)) {
        onToolChange(tool);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [document, activeTool, onToolChange, onUndo, onRedo, onZoomIn, onZoomOut, onZoomReset]);
}
