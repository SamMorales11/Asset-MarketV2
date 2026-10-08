import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import AssetCard from '../../components/AssetCard.vue';
import { useCartStore } from '../../stores/cart';
import type { Asset } from '../../types';

describe('AssetCard.vue Component', () => {
  const dummyAsset: Asset = {
    id: 'asset_card_1',
    title: 'Luxury Editorial Dashboard',
    slug: 'luxury-editorial-dashboard',
    shortDescription: 'Modern dashboard UI kit for Vue 3',
    description: 'Extensive full-length description for asset',
    assetType: 'ui_template',
    status: 'approved',
    price: 300000,
    discountPrice: 240000,
    currency: 'IDR',
    thumbnailUrl: 'https://images.unsplash.com/photo-test',
    tags: ['Vue 3', 'Tailwind', 'Editorial'],
    ratingAvg: '4.8',
    ratingCount: 15,
    seller: {
      id: 'seller_1',
      name: 'Atelier Design',
      avatarUrl: null,
      isVerifiedSeller: true,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders asset title, seller name, rating, and tags', () => {
    const wrapper = mount(AssetCard, {
      props: { asset: dummyAsset },
      global: {
        stubs: {
          'router-link': {
            template: '<a><slot /></a>',
          },
        },
      },
    });

    expect(wrapper.text()).toContain('Luxury Editorial Dashboard');
    expect(wrapper.text()).toContain('Atelier Design');
    expect(wrapper.text()).toContain('4.8');
    expect(wrapper.text()).toContain('Vue 3');
    expect(wrapper.text()).toContain('Tailwind');
  });

  it('calculates and displays discount badge and original price strike-through', () => {
    const wrapper = mount(AssetCard, {
      props: { asset: dummyAsset },
      global: {
        stubs: {
          'router-link': {
            template: '<a><slot /></a>',
          },
        },
      },
    });

    // 300k -> 240k is 20% discount
    expect(wrapper.text()).toContain('-20%');
    expect(wrapper.text()).toContain('240.000');
    expect(wrapper.text()).toContain('300.000');
  });

  it('displays FREE label for assets with price = 0', () => {
    const freeAsset: Asset = {
      ...dummyAsset,
      id: 'free_asset_1',
      price: 0,
      discountPrice: 0,
    };

    const wrapper = mount(AssetCard, {
      props: { asset: freeAsset },
      global: {
        stubs: {
          'router-link': {
            template: '<a><slot /></a>',
          },
        },
      },
    });

    expect(wrapper.text()).toContain('FREE');
  });

  it('handles Add to Cart action button click and reflects In Cart state', async () => {
    const cartStore = useCartStore();
    const wrapper = mount(AssetCard, {
      props: { asset: dummyAsset },
      global: {
        stubs: {
          'router-link': {
            template: '<a><slot /></a>',
          },
        },
      },
    });

    const addBtn = wrapper.find('button');
    expect(addBtn.text()).toContain('Add');

    await addBtn.trigger('click');
    expect(cartStore.hasItem(dummyAsset.id)).toBe(true);

    // Re-render check: should now display "In Cart"
    await wrapper.vm.$nextTick();
    expect(wrapper.find('button').text()).toContain('In Cart');
  });
});
