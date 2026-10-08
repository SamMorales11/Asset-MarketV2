import { ref } from 'vue';
import { withRetry, type RetryOptions, isRetryableError } from '../utils/retry';

export interface UseAsyncRetryOptions extends RetryOptions {
  immediate?: boolean;
}

export function useAsyncRetry<T, Args extends any[] = any[]>(
  fn: (...args: Args) => Promise<T>,
  options: UseAsyncRetryOptions = {}
) {
  const data = ref<T | null>(null);
  const error = ref<any>(null);
  const isLoading = ref<boolean>(false);
  const isRetrying = ref<boolean>(false);
  const retryCount = ref<number>(0);
  let lastArgs: Args = [] as unknown as Args;

  async function execute(...args: Args): Promise<T> {
    lastArgs = args;
    isLoading.value = true;
    error.value = null;
    retryCount.value = 0;

    try {
      const result = await withRetry(() => fn(...args), {
        ...options,
        onRetry: (attempt, err) => {
          isRetrying.value = true;
          retryCount.value = attempt;
          if (options.onRetry) {
            options.onRetry(attempt, err);
          }
        },
      });
      data.value = result as any;
      return result;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      isLoading.value = false;
      isRetrying.value = false;
    }
  }

  async function retry(): Promise<T> {
    return execute(...lastArgs);
  }

  function reset() {
    data.value = null;
    error.value = null;
    isLoading.value = false;
    isRetrying.value = false;
    retryCount.value = 0;
  }

  return {
    data,
    error,
    isLoading,
    isRetrying,
    retryCount,
    execute,
    retry,
    reset,
    isRetryable: isRetryableError,
  };
}
