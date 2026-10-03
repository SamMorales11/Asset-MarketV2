import { ref } from 'vue';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  timestamp: number;
}

const toasts = ref<ToastItem[]>([]);

export function useToast() {
  function removeToast(id: string) {
    const index = toasts.value.findIndex((t) => t.id === id);
    if (index !== -1) {
      toasts.value.splice(index, 1);
    }
  }

  function addToast(item: Omit<ToastItem, 'id' | 'timestamp'>) {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const duration = item.duration ?? 5000;

    const newToast: ToastItem = {
      ...item,
      id,
      duration,
      timestamp: Date.now(),
    };

    // Keep maximum 4 concurrent toasts
    if (toasts.value.length >= 4) {
      toasts.value.shift();
    }

    toasts.value.push(newToast);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }

  const toast = {
    show: addToast,
    success: (title: string, message?: string, duration?: number) =>
      addToast({ type: 'success', title, message, duration }),
    error: (title: string, message?: string, duration?: number) =>
      addToast({ type: 'error', title, message, duration }),
    warning: (title: string, message?: string, duration?: number) =>
      addToast({ type: 'warning', title, message, duration }),
    info: (title: string, message?: string, duration?: number) =>
      addToast({ type: 'info', title, message, duration }),
    dismiss: removeToast,
    clearAll: () => {
      toasts.value = [];
    },
  };

  return {
    toasts,
    toast,
    removeToast,
  };
}
