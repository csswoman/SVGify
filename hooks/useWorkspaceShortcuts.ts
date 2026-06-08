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
}

export function useWorkspaceShortcuts({
  document,
  activeTool,
  onToolChange,
  onUndo,
  onRedo,
}: UseWorkspaceShortcutsOptions) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

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

      const tool = toolFromKeyboard(e.key);
      if (tool && tool !== activeTool && isToolEnabled(tool, document)) {
        onToolChange(tool);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [document, activeTool, onToolChange, onUndo, onRedo]);
}
