'use client';

import { Tooltip } from '@/components/shared/Tooltip';
import { useI18n } from '@/lib/i18n';

interface BrushInspectorProps {
  brushColor: string;
  brushSize: number;
  onBrushColorChange: (color: string) => void;
  onBrushSizeChange: (size: number) => void;
}

export function BrushInspector({
  brushColor,
  brushSize,
  onBrushColorChange,
  onBrushSizeChange,
}: BrushInspectorProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('tool.brush')}</h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('shape.brushSub')}</p>
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
        {t('shape.brushColor')}
        <input
          type="color"
          value={brushColor}
          onChange={(e) => onBrushColorChange(e.target.value)}
          className="h-8 w-12 cursor-pointer rounded border border-gray-300 dark:border-gray-600"
        />
        <Tooltip text={t('shape.brush.help')} label={t('shape.modeBrush')} />
      </label>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">
          {t('shape.brushSize')}: <span className="font-mono">{brushSize}</span>
        </label>
        <input
          type="range"
          min={1}
          max={40}
          value={brushSize}
          onChange={(e) => onBrushSizeChange(Number(e.target.value))}
          className="w-full accent-blue-600"
          aria-label={`${t('shape.brushSize')}: ${brushSize}`}
        />
      </div>
    </div>
  );
}
