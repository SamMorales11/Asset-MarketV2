import { ref } from 'vue';

export type ConfirmVariant = 'primary' | 'danger' | 'success' | 'warning' | 'info';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  onConfirm?: () => Promise<void> | void;
}

export interface ConfirmState extends ConfirmOptions {
  isOpen: boolean;
  isLoading: boolean;
  resolve?: (value: boolean) => void;
}

const state = ref<ConfirmState>({
  isOpen: false,
  isLoading: false,
  title: '',
  message: '',
  confirmText: 'Konfirmasi',
  cancelText: 'Batal',
  variant: 'primary',
});

export function useConfirm() {
  function confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      state.value = {
        isOpen: true,
        isLoading: false,
        title: options.title,
        message: options.message,
        confirmText: options.confirmText ?? 'Konfirmasi',
        cancelText: options.cancelText ?? 'Batal',
        variant: options.variant ?? 'primary',
        onConfirm: options.onConfirm,
        resolve,
      };
    });
  }

  async function handleConfirm() {
    if (state.value.isLoading) return;

    if (state.value.onConfirm) {
      state.value.isLoading = true;
      try {
        await state.value.onConfirm();
        state.value.isOpen = false;
        state.value.resolve?.(true);
      } catch (err) {
        state.value.isOpen = false;
        state.value.resolve?.(false);
        throw err;
      } finally {
        state.value.isLoading = false;
      }
    } else {
      state.value.isOpen = false;
      state.value.resolve?.(true);
    }
  }

  function handleCancel() {
    if (state.value.isLoading) return;
    state.value.isOpen = false;
    state.value.resolve?.(false);
  }

  return {
    state,
    confirm,
    handleConfirm,
    handleCancel,
  };
}
