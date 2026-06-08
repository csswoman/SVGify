import { useCallback, useEffect, useRef, useState } from 'react';
import { VectorizeSettings, WorkerResponse } from '@/types/svg.types';

const VECTORIZE_TIMEOUT_MS = 45_000;

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
  const requestIdRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearVectorizeTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Initialize worker once
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const worker = new Worker(new URL('@/workers/vectorizer.worker.ts', import.meta.url), {
      type: 'module',
    });

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { type, svg, message, value, requestId } = event.data;

      if (requestId !== undefined && requestId !== requestIdRef.current) {
        return;
      }

      if (type === 'done') {
        clearVectorizeTimeout();
        if (typeof svg === 'string' && svg.length > 0) {
          setState({ svg, isLoading: false, progress: 1, error: null });
          return;
        }
        setState((prev) => ({
          svg: prev.svg,
          isLoading: false,
          progress: 0,
          error: 'La vectorización no produjo un SVG válido. Prueba bajar Colors o Pre-blur.',
        }));
      } else if (type === 'error' && message) {
        clearVectorizeTimeout();
        setState((prev) => ({
          svg: prev.svg,
          isLoading: false,
          progress: 0,
          error: message,
        }));
      } else if (type === 'progress' && value !== undefined) {
        setState((prev) => ({ ...prev, progress: value }));
      }
    };

    worker.onerror = (err) => {
      clearVectorizeTimeout();
      setState((prev) => ({
        svg: prev.svg,
        isLoading: false,
        progress: 0,
        error: `Worker error: ${err.message}`,
      }));
    };

    workerRef.current = worker;

    return () => {
      clearVectorizeTimeout();
      worker.terminate();
      workerRef.current = null;
    };
  }, [clearVectorizeTimeout]);

  const vectorize = useCallback(
    (imageData: ImageData, settings: VectorizeSettings) => {
      if (!workerRef.current) {
        setState({
          svg: null,
          isLoading: false,
          progress: 0,
          error: 'Worker not initialized',
        });
        return;
      }

      const requestId = ++requestIdRef.current;
      clearVectorizeTimeout();

      setState((prev) => ({
        ...prev,
        isLoading: true,
        progress: 0,
        error: null,
      }));

      timeoutRef.current = setTimeout(() => {
        if (requestId !== requestIdRef.current) return;
        workerRef.current?.postMessage({ type: 'cancel', requestId });
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'La vectorización tardó demasiado. Prueba bajar Colors o Pre-blur.',
        }));
      }, VECTORIZE_TIMEOUT_MS);

      workerRef.current.postMessage({
        type: 'vectorize',
        requestId,
        imageData,
        settings,
      });
    },
    [clearVectorizeTimeout]
  );

  const cancel = useCallback(() => {
    clearVectorizeTimeout();
    requestIdRef.current += 1;
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'cancel' });
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [clearVectorizeTimeout]);

  return {
    ...state,
    vectorize,
    cancel,
  };
}
