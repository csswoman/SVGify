'use client';

import { useCallback, useState } from 'react';
import { DEFAULT_ZOOM_VIEWPORT, type SvgZoomViewport, type RGBColor } from '@/types/svg.types';
import type { WorkspaceTool } from '@/types/workspace.types';
import { countPaths } from '@/lib/simplifyPath';
import { svgByteSize } from '@/lib/optimizeSvg';
import { useVectorizeSession } from '@/hooks/useVectorizeSession';
import { useWorkspaceSvg } from '@/hooks/useWorkspaceSvg';
import { useWorkspaceShapeTools } from '@/hooks/useWorkspaceShapeTools';
import { useWorkspaceLabels } from '@/hooks/useWorkspaceLabels';
import { useWorkspaceShortcuts } from '@/hooks/useWorkspaceShortcuts';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { ToolBar } from './ToolBar';
import { TopBar } from './TopBar';
import { StatusBar } from './StatusBar';
import { Canvas } from './Canvas';
import { Inspector } from './Inspector';

export function Workspace() {
  const [activeTool, setActiveTool] = useState<WorkspaceTool>('import');
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [svgString, setSvgString] = useState<string | null>(null);
  const [zoomViewport, setZoomViewport] = useState<SvgZoomViewport>(DEFAULT_ZOOM_VIEWPORT);
  const [selectedColor, setSelectedColor] = useState<RGBColor | null>(null);
  const [fillColor, setFillColor] = useState<RGBColor>({ r: 0, g: 0, b: 0 });
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

  const shapeTools = useWorkspaceShapeTools(editor, activeTool);
  const labelTools = useWorkspaceLabels(editor, activeTool);
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

  return (
    <ErrorBoundary>
      <div className="flex h-[calc(100vh-7rem)] min-h-[32rem] flex-col overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-900">
        <TopBar
          svgString={svgString}
          labels={labelTools.labels}
          canUndo={editor.canUndo}
          canRedo={editor.canRedo}
          onUndo={() => editor.undo()}
          onRedo={() => editor.redo()}
        />
        <div className="flex min-h-0 flex-1">
          <ToolBar activeTool={activeTool} document={document} onToolChange={setActiveTool} />
          <Canvas
            activeTool={activeTool}
            imageData={imageData}
            svgString={svgString}
            vectorizeSession={vectorizeSession}
            editor={svgString ? editor : null}
            shapeTools={shapeTools}
            previewBackground={previewBackground}
            selectedColor={selectedColor}
            fillColor={fillColor}
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
            shapeTools={shapeTools}
            labelTools={labelTools}
            previewBackground={previewBackground}
            selectedColor={selectedColor}
            fillColor={fillColor}
            onSelectedColorChange={setSelectedColor}
            onFillColorChange={setFillColor}
            onPreviewBackgroundChange={setPreviewBackground}
            onImageData={setImageData}
            onSvgString={setSvgString}
            onToolChange={setActiveTool}
          />
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
