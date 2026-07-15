import { LabelInfo, prependLabelLegend } from '@/lib/labelUtils';
import { serializeSvgElement } from '@/lib/serializeSvg';

export interface ExportPayloadOptions {
  includeLabelLegend: boolean;
  labels: LabelInfo[];
}

function normalizeExportPayload(payload: string): string {
  return payload.replace(/\r\n/g, '\n').trim();
}

export function buildDownloadPayload(
  svgEl: SVGSVGElement,
  options: ExportPayloadOptions
): string {
  const svgString = serializeSvgElement(svgEl);
  if (!options.includeLabelLegend) return normalizeExportPayload(svgString);
  return normalizeExportPayload(prependLabelLegend(svgString, options.labels));
}
