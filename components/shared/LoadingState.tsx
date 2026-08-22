'use client';

interface LoadingStateProps {
  isLoading: boolean;
  progress?: number;
  message?: string;
}

export function LoadingState({ isLoading, progress, message }: LoadingStateProps) {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface dark:bg-dark-surface rounded-lg p-8 max-w-sm">
        <div className="text-center">
          <div className="mb-4">
            <div className="inline-block w-12 h-12 border-4 border-border dark:border-dark-border border-t-accent dark:border-t-dark-accent rounded-full animate-spin" />
          </div>
          <p className="text-lg font-semibold text-ink-muted dark:text-dark-ink-muted mb-2">
            {message || 'Processing...'}
          </p>
          {progress !== undefined && (
            <div className="w-full bg-surface-sunken dark:bg-dark-surface-sunken rounded-full h-2 mt-4">
              <div
                className="bg-accent-solid dark:bg-dark-accent-solid h-2 rounded-full transition-all"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
