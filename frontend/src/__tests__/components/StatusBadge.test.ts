import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import StatusBadge from '../../components/StatusBadge.vue';

describe('StatusBadge.vue Component', () => {
  it('renders "Approved & Live" with success style for approved status', () => {
    const wrapper = mount(StatusBadge, {
      props: { status: 'approved' },
    });

    expect(wrapper.text()).toContain('Approved & Live');
    expect(wrapper.html()).toContain('text-success');
  });

  it('renders "Perlu Revisi" for rejected status', () => {
    const wrapper = mount(StatusBadge, {
      props: { status: 'rejected' },
    });

    expect(wrapper.text()).toContain('Perlu Revisi');
    expect(wrapper.html()).toContain('text-primary');
  });

  it('renders "Menunggu Review" with pulsing animation for pending status', () => {
    const wrapper = mount(StatusBadge, {
      props: { status: 'pending' },
    });

    expect(wrapper.text()).toContain('Menunggu Review');
    expect(wrapper.html()).toContain('animate-ping');
  });

  it('renders helper description when showHelper is enabled', () => {
    const wrapper = mount(StatusBadge, {
      props: { status: 'approved', showHelper: true },
    });

    expect(wrapper.text()).toContain('Aktif di Katalog Publik');
  });
});
