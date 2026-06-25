'use client';

import type { ReactNode } from 'react';
import { I18nProvider, useI18n } from '@/lib/i18n';
import { ThemeProvider } from '@/lib/theme';

function Footer() {
  const { t } = useI18n();
  return (
    <footer className="shrink-0 border-t border-gray-200 bg-white py-3 px-6 text-center text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
      <p>
        SVGcraft — MIT License · {t('app.footer')} ·{' '}
        <a
          href="https://github.com"
          className="focus-ring rounded underline hover:text-gray-600 dark:hover:text-gray-300"
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
        <main className="flex-1 w-full mx-auto px-3 sm:px-4 py-3">{children}</main>
        <Footer />
      </I18nProvider>
    </ThemeProvider>
  );
}
