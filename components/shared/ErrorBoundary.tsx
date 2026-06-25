'use client';

import { ReactNode, Component, ErrorInfo } from 'react';
import { useI18n } from '@/lib/i18n';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

function ErrorFallback({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="rounded-lg border border-red-400 bg-red-100 p-6 dark:border-red-800 dark:bg-red-950/40">
      <h2 className="mb-2 text-lg font-bold text-red-800 dark:text-red-300">{t('error.title')}</h2>
      <p className="text-sm text-red-700 dark:text-red-300">{message || t('error.unknown')}</p>
      <button
        type="button"
        onClick={onRetry}
        className="focus-ring mt-4 rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
      >
        {t('error.tryAgain')}
      </button>
    </div>
  );
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          message={this.state.error?.message ?? ''}
          onRetry={() => this.setState({ hasError: false, error: null })}
        />
      );
    }

    return this.props.children;
  }
}
