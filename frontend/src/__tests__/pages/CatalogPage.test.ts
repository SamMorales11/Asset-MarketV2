import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import CatalogPage from '../../pages/CatalogPage.vue';
import { assetService } from '../../services/assets';

// Mock vue-router
const pushMock = vi.fn();
vi.mock('vue-router', () => ({
  useRoute: () => ({
    query: {},
  }),
  useRouter: () => ({
    push: pushMock,
  }),
}));

// Mock assetService
vi.mock('../../services/assets', () => ({
  assetService: {
    getCategories: vi.fn().mockResolvedValue([
      { id: 'cat-1', name: 'Templates', slug: 'templates', assetCount: 10 },
      { id: 'cat-2', name: 'Source Code', slug: 'source-code', assetCount: 5 },
    ]),
    getPublicAssets: vi.fn().mockResolvedValue({
      assets: [
        {
          id: 'asset-1',
          title: 'Vue 3 Luxury Dashboard',
          slug: 'vue-3-luxury-dashboard',
          shortDescription: 'Modern dashboard UI kit',
          price: 250000,
          discountPrice: null,
          currency: 'IDR',
          thumbnailUrl: 'https://example.com/thumb.jpg',
          tags: ['Vue', 'Luxury'],
          assetType: 'ui_template',
          ratingAvg: '4.9',
          ratingCount: 12,
        },
      ],
      pagination: {
        total: 1,
        page: 1,
        limit: 12,
        totalPages: 1,
      },
    }),
  },
}));

describe('CatalogPage.vue Search & Filter Integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('renders hero title, search input, and category pills', async () => {
    const wrapper = mount(CatalogPage, {
      global: {
        stubs: {
          AssetCard: { template: '<div class="asset-card">{{ asset.title }}</div>', props: ['asset'] },
          AssetCardSkeleton: true,
          EmptyState: true,
          'router-link': { template: '<a><slot /></a>' },
        },
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain('Explore Assets');
    expect(wrapper.find('input[placeholder*="Search by title"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('All Categories');
    expect(wrapper.text()).toContain('Templates');
  });

  it('renders pricing filter options (All, Paid Only, Free Only)', async () => {
    const wrapper = mount(CatalogPage, {
      global: {
        stubs: {
          AssetCard: true,
          AssetCardSkeleton: true,
          EmptyState: true,
          'router-link': true,
        },
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain('Pricing Model');
    expect(wrapper.text()).toContain('Paid');
    expect(wrapper.text()).toContain('Free');
  });

  it('updates query params when a category or pricing model is selected', async () => {
    const wrapper = mount(CatalogPage, {
      global: {
        stubs: {
          AssetCard: true,
          AssetCardSkeleton: true,
          EmptyState: true,
          'router-link': true,
        },
      },
    });

    await flushPromises();

    // Click 'Templates' category pill
    const templatesBtn = wrapper.findAll('button').find((b) => b.text().includes('Templates'));
    expect(templatesBtn).toBeDefined();
    await templatesBtn?.trigger('click');

    expect(pushMock).toHaveBeenCalledWith({
      query: expect.objectContaining({ category: 'templates' }),
    });
  });

  it('handles debounced typing and immediately handles enter in search input', async () => {
    vi.useFakeTimers();
    const wrapper = mount(CatalogPage, {
      global: {
        stubs: {
          AssetCard: true,
          AssetCardSkeleton: true,
          EmptyState: true,
          'router-link': true,
        },
      },
    });

    await flushPromises();

    const searchInput = wrapper.find('input[placeholder*="Search by title"]');
    await searchInput.setValue('Dashboard');
    await searchInput.trigger('input');

    // Before timer advances
    expect(pushMock).not.toHaveBeenCalled();

    // Advance 350ms
    vi.advanceTimersByTime(350);

    expect(pushMock).toHaveBeenCalledWith({
      query: expect.objectContaining({ q: 'Dashboard' }),
    });

    vi.useRealTimers();
  });
});
