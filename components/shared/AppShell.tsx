'use client';

import type { ReactNode } from 'react';
import { I18nProvider, useI18n } from '@/lib/i18n';
import { ThemeProvider } from '@/lib/theme';

function Footer() {
  const { t } = useI18n();
  return (
    <footer className="shrink-0 border-t border-gray-200 bg-white px-4 py-1 text-center text-[11px] leading-snug text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
      <p>
        <span className="text-gray-500 dark:text-gray-400">MIT</span>
        {' · '}
        {t('app.footer')}
        {' · '}
        <a
          href="https://github.com/csswoman/svg-tool"
          className="focus-ring rounded underline decoration-gray-300 underline-offset-2 hover:text-gray-700 dark:decoration-gray-600 dark:hover:text-gray-300"
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
