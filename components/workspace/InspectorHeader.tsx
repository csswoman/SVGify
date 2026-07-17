interface InspectorHeaderProps {
  title: string;
  subtitle?: string;
}

/** Shared title block for contextual inspectors — keeps hierarchy consistent. */
export function InspectorHeader({ title, subtitle }: InspectorHeaderProps) {
  return (
    <div className="space-y-1">
      <h2 className="text-sm font-semibold text-ink dark:text-dark-ink">{title}</h2>
      {subtitle ? (
        <p className="text-pretty text-xs text-ink-muted dark:text-dark-ink-muted">{subtitle}</p>
      ) : null}
    </div>
  );
}
