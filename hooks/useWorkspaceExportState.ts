'use client';

import { useCallback, useMemo, useState } from 'react';
import { buildDownloadPayload } from '@/lib/exportPayload';
import type { LabelInfo } from '@/lib/labelUtils';
import type { WorkspaceExportStatus } from '@/types/workspace.types';

interface UseWorkspaceExportStateOptions {
  svgString: string | null;
  svgEl: SVGElement | null;
  labels: LabelInfo[];
  staleHint: string;
}

export function useWorkspaceExportState({
  svgString,
  svgEl,
  labels,
  staleHint,
}: UseWorkspaceExportStateOptions) {
  const [includeLabelLegend, setIncludeLabelLegend] = useState(true);
  const [preparedPayload, setPreparedPayload] = useState<string | null>(null);

  const currentPayload = useMemo(() => {
    if (!svgString || !(svgEl instanceof SVGSVGElement)) return null;
    return buildDownloadPayload(svgEl, {
      includeLabelLegend,
      labels,
    });
  }, [svgString, svgEl, includeLabelLegend, labels]);

  const exportStatus: WorkspaceExportStatus = useMemo(() => {
    if (!svgString || !currentPayload) return 'no_document';
    if (!preparedPayload) return 'not_prepared';
    return preparedPayload === currentPayload
      ? 'prepared_current'
      : 'prepared_stale';
  }, [svgString, currentPayload, preparedPayload]);

  const effectiveStatusMessage =
    exportStatus === 'prepared_stale' ? staleHint : null;

  const markPrepared = useCallback((payload: string) => {
    setPreparedPayload(payload);
  }, []);

  const resetExportState = useCallback(() => {
    setIncludeLabelLegend(true);
    setPreparedPayload(null);
  }, []);

  return {
    includeLabelLegend,
    setIncludeLabelLegend,
    currentPayload,
    preparedPayload,
    exportStatus,
    effectiveStatusMessage,
    markPrepared,
    resetExportState,
  };
}

