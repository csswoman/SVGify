'use client';

import type { ReactNode } from 'react';
import { I18nProvider, useI18n } from '@/lib/i18n';
import { ThemeProvider, useTheme } from '@/lib/theme';

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = theme === 'light' ? 'dark' : 'light';
  return (
    <button
      onClick={() => setTheme(next)}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
      aria-label={`Switch to ${next} mode`}
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
}

function LangToggle() {
  const { lang, setLang, t } = useI18n();
  return (
    <button
      onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
      aria-label={`Switch language to ${t('lang.toggle')}`}
    >
      🌐 {t('lang.toggle')}
    </button>
  );
}

function Header() {
  const { t } = useI18n();
  return (
    <header className="bg-white border-b border-gray-200 py-4 px-6 shrink-0 dark:bg-gray-800 dark:border-gray-700">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div>
          <span className="text-xl font-bold tracking-tight">SVGcraft</span>
          <span className="ml-3 text-xs text-gray-400 hidden sm:inline dark:text-gray-500">{t('app.tagline')}</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LangToggle />
        </div>
      </div>
    </header>
  );
}

function Footer() {
  const { t } = useI18n();
  return (
    <footer className="shrink-0 border-t border-gray-200 bg-white py-5 px-6 text-center text-xs text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500">
      <p>
        SVGcraft — MIT License · {t('app.footer')} ·{' '}
        <a
          href="https://github.com"
          className="underline hover:text-gray-600 dark:hover:text-gray-300"
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
        <Header />
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-10">{children}</main>
        <Footer />
      </I18nProvider>
    </ThemeProvider>
  );
}
