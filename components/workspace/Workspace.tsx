'use client';

import { useCallback, useState } from 'react';
import { DEFAULT_ZOOM_VIEWPORT, type SvgZoomViewport } from '@/types/svg.types';
import type { RGBColor } from '@/types/svg.types';
import type { WorkspaceTool } from '@/types/workspace.types';
import { countPaths } from '@/lib/simplifyPath';
import { svgByteSize } from '@/lib/optimizeSvg';
import { useVectorizeSession } from '@/hooks/useVectorizeSession';
import { useWorkspaceSvg } from '@/hooks/useWorkspaceSvg';
import { useWorkspaceShortcuts } from '@/hooks/useWorkspaceShortcuts';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { ToolBar } from './ToolBar';
import { TopBar } from './TopBar';
import { StatusBar } from './StatusBar';
import { Canvas } from './Canvas';
import { Inspector } from './Inspector';
import { LegacyToolBridge } from './LegacyToolBridge';

const LEGACY_TOOLS = new Set<WorkspaceTool>(['erase', 'brush', 'nodes', 'labels']);

export function Workspace() {
  const [activeTool, setActiveTool] = useState<WorkspaceTool>('import');
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [svgString, setSvgString] = useState<string | null>(null);
  const [zoomViewport, setZoomViewport] = useState<SvgZoomViewport>(DEFAULT_ZOOM_VIEWPORT);
  const [selectedColor, setSelectedColor] = useState<RGBColor | null>(null);
  const [previewBackground, setPreviewBackground] = useState<'checkerboard' | 'black'>('checkerboard');

  const handleSvgReady = useCallback((svg: string) => {
    setSvgString(svg);
    setZoomViewport(DEFAULT_ZOOM_VIEWPORT);
    setActiveTool('select');
  }, []);

  const vectorizeSession = useVectorizeSession({
    imageData,
    onSvgReady: handleSvgReady,
  });

  const editor = useWorkspaceSvg({
    svgString,
    zoomViewport,
    onZoomViewportChange: setZoomViewport,
    onSvgChange: setSvgString,
  });

  const document = { imageData, svgString };

  useWorkspaceShortcuts({
    document,
    activeTool,
    onToolChange: setActiveTool,
    onUndo: () => editor.undo(),
    onRedo: () => editor.redo(),
  });

  const pathCount = svgString ? countPaths(svgString) : 0;
  const byteSize = svgString ? svgByteSize(svgString) : 0;
  const zoomPercent = Math.round(zoomViewport.scale * 100);
  const useLegacy = LEGACY_TOOLS.has(activeTool) && !!svgString;

  return (
    <ErrorBoundary>
      <div className="flex h-[calc(100vh-7rem)] min-h-[32rem] flex-col overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-900">
        <TopBar
          svgString={svgString}
          canUndo={editor.canUndo}
          canRedo={editor.canRedo}
          onUndo={() => editor.undo()}
          onRedo={() => editor.redo()}
        />
        <div className="flex min-h-0 flex-1">
          <ToolBar activeTool={activeTool} document={document} onToolChange={setActiveTool} />
          {useLegacy ? (
            <LegacyToolBridge
              activeTool={activeTool}
              svgString={svgString!}
              zoomViewport={zoomViewport}
              onZoomViewportChange={setZoomViewport}
              onSvgString={setSvgString}
            />
          ) : (
            <>
              <Canvas
                activeTool={activeTool}
                imageData={imageData}
                svgString={svgString}
                vectorizeSession={vectorizeSession}
                editor={svgString ? editor : null}
                previewBackground={previewBackground}
                selectedColor={selectedColor}
                onSelectedColorChange={setSelectedColor}
                onImageData={setImageData}
                onUploadError={() => {}}
                onToolChange={setActiveTool}
              />
              <Inspector
                activeTool={activeTool}
                imageData={imageData}
                svgString={svgString}
                vectorizeSession={vectorizeSession}
                editor={svgString ? editor : null}
                previewBackground={previewBackground}
                selectedColor={selectedColor}
                onSelectedColorChange={setSelectedColor}
                onPreviewBackgroundChange={setPreviewBackground}
                onImageData={setImageData}
                onSvgString={setSvgString}
                onToolChange={setActiveTool}
              />
            </>
          )}
        </div>
        <StatusBar
          pathCount={pathCount}
          byteSize={byteSize}
          zoomPercent={zoomPercent}
          activeTool={activeTool}
        />
      </div>
    </ErrorBoundary>
  );
}
