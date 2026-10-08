import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useToast } from '../../composables/useToast';

describe('useToast Composable', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    const { toast } = useToast();
    toast.clearAll();
  });

  it('adds a toast item and assigns unique ID', () => {
    const { toasts, toast } = useToast();
    const id = toast.success('Berhasil', 'Operasi sukses');

    expect(toasts.value.length).toBe(1);
    expect(toasts.value[0].id).toBe(id);
    expect(toasts.value[0].title).toBe('Berhasil');
    expect(toasts.value[0].type).toBe('success');
  });

  it('supports various toast severity types', () => {
    const { toasts, toast } = useToast();
    toast.error('Error Title', 'Error msg');
    toast.warning('Warning Title');
    toast.info('Info Title');

    expect(toasts.value.length).toBe(3);
    expect(toasts.value[0].type).toBe('error');
    expect(toasts.value[1].type).toBe('warning');
    expect(toasts.value[2].type).toBe('info');
  });

  it('caps max concurrent toasts to 4 by dropping the oldest', () => {
    const { toasts, toast } = useToast();
    toast.info('Toast 1');
    toast.info('Toast 2');
    toast.info('Toast 3');
    toast.info('Toast 4');
    expect(toasts.value.length).toBe(4);

    toast.info('Toast 5');
    expect(toasts.value.length).toBe(4);
    expect(toasts.value[0].title).toBe('Toast 2');
    expect(toasts.value[3].title).toBe('Toast 5');
  });

  it('automatically removes toast after duration timeout', () => {
    const { toasts, toast } = useToast();
    toast.success('Expiring Toast', undefined, 3000);
    expect(toasts.value.length).toBe(1);

    vi.advanceTimersByTime(2999);
    expect(toasts.value.length).toBe(1);

    vi.advanceTimersByTime(2);
    expect(toasts.value.length).toBe(0);
  });

  it('manually dismisses a toast by ID', () => {
    const { toasts, toast, removeToast } = useToast();
    const id = toast.info('To be removed');
    expect(toasts.value.length).toBe(1);

    removeToast(id);
    expect(toasts.value.length).toBe(0);
  });
});
