import { useCallback, useEffect, useRef, useState } from 'react';
import { VectorizeSettings, WorkerResponse } from '@/types/svg.types';

export interface VectorizerState {
  svg: string | null;
  isLoading: boolean;
  progress: number;
  error: string | null;
}

export function useVectorizer() {
  const [state, setState] = useState<VectorizerState>({
    svg: null,
    isLoading: false,
    progress: 0,
    error: null,
  });

  const workerRef = useRef<Worker | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Initialize worker once
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const worker = new Worker(new URL('@/workers/vectorizer.worker.ts', import.meta.url), {
      type: 'module',
    });

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { type, svg, message, value } = event.data;

      if (type === 'done' && svg) {
        setState({ svg, isLoading: false, progress: 1, error: null });
      } else if (type === 'error' && message) {
        setState({ svg: null, isLoading: false, progress: 0, error: message });
      } else if (type === 'progress' && value !== undefined) {
        setState((prev) => ({ ...prev, progress: value }));
      }
    };

    worker.onerror = (err) => {
      setState({
        svg: null,
        isLoading: false,
        progress: 0,
        error: `Worker error: ${err.message}`,
      });
    };

    workerRef.current = worker;

    return () => {
      worker.terminate();
    };
  }, []);

  const vectorize = useCallback(
    async (imageData: ImageData, settings: VectorizeSettings) => {
      if (!workerRef.current) {
        setState({
          svg: null,
          isLoading: false,
          progress: 0,
          error: 'Worker not initialized',
        });
        return;
      }

      setState({ svg: null, isLoading: true, progress: 0, error: null });
      abortRef.current = new AbortController();

      workerRef.current.postMessage({
        type: 'vectorize',
        imageData,
        settings,
      });
    },
    []
  );

  const cancel = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'cancel' });
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  return {
    ...state,
    vectorize,
    cancel,
  };
}
