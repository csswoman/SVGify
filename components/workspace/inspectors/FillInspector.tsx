'use client';

import { useEffect, useRef, useState } from 'react';
import type { RGBColor } from '@/types/svg.types';
import { ColorPicker } from '@/components/colors/ColorPicker';
import { ColorSwatches } from '@/components/colors/ColorSwatches';
import { useSvgColors } from '@/hooks/useSvgColors';
import { rgbToHex } from '@/lib/colorUtils';
import { useI18n } from '@/lib/i18n';
import { InspectorHeader } from '@/components/workspace/InspectorHeader';
import { inspectorHint, inspectorStack } from '@/components/workspace/inspectorChrome';

interface FillInspectorProps {
  initialColor: RGBColor | null;
  svgEl: SVGElement | null;
  isSampling: boolean;
  sampledColor: RGBColor | null;
  onFillColorChange: (color: RGBColor) => void;
}

/** Paint / Pick live in the ToolBar nest — inspector owns color only. */
export function FillInspector({
  initialColor,
  svgEl,
  isSampling,
  sampledColor,
  onFillColorChange,
}: FillInspectorProps) {
  const { t } = useI18n();
  const { colors, extractColors } = useSvgColors(svgEl);
  const [fillColor, setFillColor] = useState<RGBColor>(
    initialColor ?? { r: 0, g: 0, b: 0 }
  );
  const userPickedRef = useRef(false);
  const adoptedRef = useRef(false);
  const fillHex = rgbToHex(fillColor);
  const paintReady = colors.length > 0;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- local picker buffer mirrors the shared Fill color
    setFillColor(initialColor ?? { r: 0, g: 0, b: 0 });
  }, [initialColor]);

  useEffect(() => {
    if (!svgEl) return;
    const observer = new MutationObserver(() => extractColors());
    observer.observe(svgEl, {
      subtree: true,
      attributes: true,
      attributeFilter: ['fill', 'stroke'],
    });
    return () => observer.disconnect();
  }, [svgEl, extractColors]);

  // Adopt first SVG color once when the user hasn't chosen yet (avoids painting default black).
  useEffect(() => {
    if (userPickedRef.current || adoptedRef.current || colors.length === 0) {
      return;
    }
    const initialHex = initialColor ? rgbToHex(initialColor) : null;
    const initialInPalette =
      initialHex !== null && colors.some((c) => rgbToHex(c) === initialHex);
    const next = initialInPalette && initialColor ? initialColor : colors[0];
    adoptedRef.current = true;
    setFillColor(next);
    onFillColorChange(next);
  }, [colors, initialColor, onFillColorChange]);

  const handleColorChange = (color: RGBColor) => {
    userPickedRef.current = true;
    setFillColor(color);
    onFillColorChange(color);
  };

  return (
    <div className={inspectorStack}>
      <InspectorHeader
        title={t('tool.fill')}
        subtitle={isSampling ? t('workspace.fillSampleHint') : t('workspace.fillHint')}
      />

      <div className="flex items-center gap-3">
        <span
          className={`h-12 w-12 shrink-0 rounded-md border border-border dark:border-dark-border ${
            paintReady ? '' : 'opacity-40'
          }`}
          style={{ backgroundColor: paintReady ? fillHex : 'transparent' }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-ink-muted dark:text-dark-ink-muted">
            {t('workspace.fillCurrentColor')}
          </p>
          <p className="truncate font-mono text-xs text-ink dark:text-dark-ink">
            {paintReady ? fillHex : '—'}
          </p>
        </div>
      </div>
      {sampledColor ? (
        <p className={inspectorHint}>
          {t('workspace.fillSampledColor')} {rgbToHex(sampledColor)}
        </p>
      ) : null}

      <ColorSwatches
        colors={colors}
        selectedColor={fillColor}
        onColorClick={handleColorChange}
      />
      <fieldset disabled={!paintReady} className="min-w-0 disabled:opacity-50">
        <ColorPicker color={fillColor} onChange={handleColorChange} />
      </fieldset>
    </div>
  );
}
