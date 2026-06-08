'use client';

import { useState } from 'react';
import { DEFAULT_ZOOM_VIEWPORT, type SvgZoomViewport } from '@/types/svg.types';
import type { WorkspaceTool } from '@/types/workspace.types';
import { countPaths } from '@/lib/simplifyPath';
import { svgByteSize } from '@/lib/optimizeSvg';
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

  const document = { imageData, svgString };
  const pathCount = svgString ? countPaths(svgString) : 0;
  const byteSize = svgString ? svgByteSize(svgString) : 0;
  const zoomPercent = Math.round(zoomViewport.scale * 100);

  return (
    <ErrorBoundary>
      <div className="flex h-[calc(100vh-7rem)] min-h-[32rem] flex-col overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-900">
        <TopBar
          svgString={svgString}
          canUndo={false}
          canRedo={false}
          onUndo={() => {}}
          onRedo={() => {}}
        />
        <div className="flex min-h-0 flex-1">
          <ToolBar activeTool={activeTool} document={document} onToolChange={setActiveTool} />
          <Canvas
            activeTool={activeTool}
            imageData={imageData}
            svgString={svgString}
            zoomViewport={zoomViewport}
            onZoomViewportChange={setZoomViewport}
            onImageData={setImageData}
            onSvgString={setSvgString}
            onToolChange={setActiveTool}
          />
          <Inspector
            activeTool={activeTool}
            imageData={imageData}
            svgString={svgString}
            zoomViewport={zoomViewport}
            onZoomViewportChange={setZoomViewport}
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
