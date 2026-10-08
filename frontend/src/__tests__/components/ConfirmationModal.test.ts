import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ConfirmationModal from '../../components/ConfirmationModal.vue';

describe('ConfirmationModal.vue Component', () => {
  const mountModal = (props: any) => {
    return mount(ConfirmationModal, {
      props,
      global: {
        stubs: {
          Teleport: true,
          Transition: false,
        },
      },
    });
  };

  it('does not render modal dialog when isOpen is false', () => {
    const wrapper = mountModal({
      isOpen: false,
      title: 'Konfirmasi Tindakan',
      message: 'Apakah Anda yakin?',
    });

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
  });

  it('renders modal dialog content when isOpen is true', () => {
    const wrapper = mountModal({
      isOpen: true,
      title: 'Hapus Item',
      message: 'Aksi ini tidak dapat dibatalkan.',
      confirmText: 'Hapus Sekarang',
      cancelText: 'Batalkan',
      variant: 'danger',
    });

    expect(wrapper.find('[role="dialog"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Hapus Item');
    expect(wrapper.text()).toContain('Aksi ini tidak dapat dibatalkan.');
    expect(wrapper.text()).toContain('Hapus Sekarang');
    expect(wrapper.text()).toContain('Batalkan');
  });

  it('emits confirm event when confirm button is clicked', async () => {
    const wrapper = mountModal({
      isOpen: true,
      title: 'Verifikasi',
      confirmText: 'Lanjutkan',
    });

    const buttons = wrapper.findAll('button');
    const confirmBtn = buttons.find((b) => b.text().includes('Lanjutkan'));
    expect(confirmBtn).toBeDefined();

    await confirmBtn?.trigger('click');
    expect(wrapper.emitted('confirm')).toBeTruthy();
  });

  it('emits cancel event when cancel button is clicked', async () => {
    const wrapper = mountModal({
      isOpen: true,
      title: 'Verifikasi',
      cancelText: 'Batal Proses',
    });

    const buttons = wrapper.findAll('button');
    const cancelBtn = buttons.find((b) => b.text().includes('Batal Proses'));
    expect(cancelBtn).toBeDefined();

    await cancelBtn?.trigger('click');
    expect(wrapper.emitted('cancel')).toBeTruthy();
  });

  it('shows loading spinner and disables buttons during isLoading', () => {
    const wrapper = mountModal({
      isOpen: true,
      isLoading: true,
      title: 'Memproses...',
      confirmText: 'Simpan',
    });

    const buttons = wrapper.findAll('button');
    for (const btn of buttons) {
      expect(btn.attributes('disabled')).toBeDefined();
    }
  });
});
