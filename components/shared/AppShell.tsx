'use client';

import type { ReactNode } from 'react';
import { I18nProvider, useI18n } from '@/lib/i18n';
import { ThemeProvider } from '@/lib/theme';

function Footer() {
  const { t } = useI18n();
  return (
    <footer className="shrink-0 border-t border-border bg-surface px-4 py-1 text-center text-[11px] leading-snug text-ink-muted dark:border-dark-border dark:bg-dark-surface dark:text-dark-ink-muted">
      <p>
        <span className="text-ink-muted dark:text-dark-ink-muted">MIT licensed</span>
        {' · '}
        <a
          href="https://github.com/csswoman/svg-tool"
          className="focus-ring rounded underline decoration-border-strong underline-offset-2 hover:text-ink dark:decoration-dark-border-strong dark:hover:text-dark-ink"
          title={t('app.source.hint')}
          aria-label={t('app.source.hint')}
          rel="noopener noreferrer"
          target="_blank"
        >
          {t('app.source')}
        </a>
      </p>
    </footer>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>
        <div className="flex min-h-0 flex-1 flex-col">
          <main className="flex min-h-0 flex-1 flex-col">{children}</main>
          <Footer />
        </div>
      </I18nProvider>
    </ThemeProvider>
  );
}
