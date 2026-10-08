import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import EmptyState from '../../components/EmptyState.vue';

describe('EmptyState.vue Component', () => {
  it('renders title and description properly', () => {
    const wrapper = mount(EmptyState, {
      props: {
        title: 'Keranjang Kosong',
        description: 'Anda belum menambahkan aset apapun ke keranjang.',
      },
    });

    expect(wrapper.text()).toContain('Keranjang Kosong');
    expect(wrapper.text()).toContain('Anda belum menambahkan aset apapun');
  });

  it('renders action button and emits action event on click', async () => {
    const wrapper = mount(EmptyState, {
      props: {
        title: 'Koleksi Kosong',
        actionText: 'Jelajahi Katalog',
      },
    });

    const actionBtn = wrapper.find('button');
    expect(actionBtn.exists()).toBe(true);
    expect(actionBtn.text()).toContain('Jelajahi Katalog');

    await actionBtn.trigger('click');
    expect(wrapper.emitted('action')).toBeTruthy();
  });
});
