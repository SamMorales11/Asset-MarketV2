import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useConfirm } from '../../composables/useConfirm';

describe('useConfirm Composable', () => {
  beforeEach(() => {
    const { state } = useConfirm();
    state.value.isOpen = false;
    state.value.isLoading = false;
  });

  it('opens confirmation modal and updates state', () => {
    const { state, confirm } = useConfirm();

    confirm({
      title: 'Hapus Item',
      message: 'Apakah Anda yakin ingin menghapus item ini?',
      confirmText: 'Ya, Hapus',
      variant: 'danger',
    });

    expect(state.value.isOpen).toBe(true);
    expect(state.value.title).toBe('Hapus Item');
    expect(state.value.message).toBe('Apakah Anda yakin ingin menghapus item ini?');
    expect(state.value.confirmText).toBe('Ya, Hapus');
    expect(state.value.variant).toBe('danger');
  });

  it('resolves promise with true when handleConfirm is invoked', async () => {
    const { confirm, handleConfirm } = useConfirm();

    const promise = confirm({
      title: 'Konfirmasi',
      message: 'Lanjutkan?',
    });

    await handleConfirm();

    const result = await promise;
    expect(result).toBe(true);
  });

  it('resolves promise with false when handleCancel is invoked', async () => {
    const { confirm, handleCancel, state } = useConfirm();

    const promise = confirm({
      title: 'Batal',
      message: 'Batal proses?',
    });

    handleCancel();

    const result = await promise;
    expect(result).toBe(false);
    expect(state.value.isOpen).toBe(false);
  });

  it('handles async onConfirm callback and manages isLoading state', async () => {
    const { confirm, handleConfirm, state } = useConfirm();
    const onConfirmMock = vi.fn().mockImplementation(async () => {
      // Async task
      await new Promise((r) => setTimeout(r, 10));
    });

    confirm({
      title: 'Async Confirm',
      message: 'Tunggu proses...',
      onConfirm: onConfirmMock,
    });

    await handleConfirm();
    expect(onConfirmMock).toHaveBeenCalledTimes(1);
    expect(state.value.isOpen).toBe(false);
    expect(state.value.isLoading).toBe(false);
  });
});
