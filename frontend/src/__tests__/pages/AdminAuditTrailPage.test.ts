import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import AdminAuditTrailPage from '../../pages/AdminAuditTrailPage.vue';
import { adminService } from '../../services/admin';

// Mock vue-router
vi.mock('vue-router', () => ({
  useRoute: () => ({
    path: '/admin/audit',
    query: {},
  }),
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

const mockLogsData = {
  logs: [
    {
      id: 'log-1',
      adminId: 'admin-uuid-1',
      action: 'ASSET_APPROVE',
      targetEntity: 'assets',
      targetId: 'asset-uuid-101',
      oldValues: { status: 'pending' },
      newValues: { status: 'approved' },
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 Chrome',
      notes: 'Asset "Editorial Luxury Template" approved by admin.',
      createdAt: '2026-10-02T10:08:31.665Z',
      adminName: 'Chief Moderator',
      adminEmail: 'moderator@assetmarket.com',
      adminRole: 'admin',
    },
    {
      id: 'log-2',
      adminId: 'admin-uuid-1',
      action: 'PAYMENT_VERIFY',
      targetEntity: 'payment_confirmations',
      targetId: 'payment-uuid-202',
      oldValues: { transactionStatus: 'processing' },
      newValues: { transactionStatus: 'paid', revenueSettled: true },
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 Chrome',
      notes: 'Verified bank payment for invoice INV-20261002-BBBB73.',
      createdAt: '2026-10-02T10:09:28.811Z',
      adminName: 'Chief Moderator',
      adminEmail: 'moderator@assetmarket.com',
      adminRole: 'admin',
    },
    {
      id: 'log-3',
      adminId: 'admin-uuid-2',
      action: 'ASSET_REJECT',
      targetEntity: 'assets',
      targetId: 'asset-uuid-303',
      oldValues: { status: 'pending' },
      newValues: { status: 'rejected' },
      ipAddress: '192.168.1.1',
      userAgent: 'Firefox',
      notes: 'Missing documentation and low quality preview.',
      createdAt: '2026-10-02T11:00:00.000Z',
      adminName: 'Super Admin',
      adminEmail: 'super@assetmarket.com',
      adminRole: 'superadmin',
    },
  ],
  pagination: {
    total: 3,
    page: 1,
    limit: 20,
    totalPages: 1,
  },
  stats: {
    totalActions: 3,
    totalApprovals: 1,
    totalRejections: 1,
    totalPayments: 1,
    totalUsersManaged: 0,
  },
  availableAdmins: [
    { id: 'admin-uuid-1', name: 'Chief Moderator', email: 'moderator@assetmarket.com', role: 'admin' },
    { id: 'admin-uuid-2', name: 'Super Admin', email: 'super@assetmarket.com', role: 'superadmin' },
  ],
};

// Mock adminService
vi.mock('../../services/admin', () => ({
  adminService: {
    getAuditLogs: vi.fn(),
  },
}));

describe('AdminAuditTrailPage.vue Component Integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    (adminService.getAuditLogs as any).mockResolvedValue(mockLogsData);
  });

  function createWrapper() {
    return mount(AdminAuditTrailPage, {
      global: {
        stubs: {
          AdminNav: { template: '<div class="admin-nav-stub" />' },
          TableSkeleton: { template: '<div class="table-skeleton-stub" />' },
          EmptyState: {
            template: '<div class="empty-state-stub"><h4>{{ title }}</h4><button @click="$emit(\'action\')">Reset</button></div>',
            props: ['title', 'description', 'actionText'],
          },
          'router-link': { template: '<a><slot /></a>', props: ['to'] },
        },
      },
    });
  }

  it('renders page header, title, and KPI stat counters', async () => {
    const wrapper = createWrapper();
    await flushPromises();

    expect(wrapper.text()).toContain('Admin Audit Trail & Immutable Log');
    expect(wrapper.text()).toContain('Pusat riwayat seluruh tindakan administrator');
    expect(wrapper.text()).toContain('Total Log Tercatat');
    expect(wrapper.text()).toContain('Persetujuan & Revisi');
    expect(wrapper.text()).toContain('Verifikasi Pembayaran');
    expect(wrapper.text()).toContain('Admin Bertugas');
  });

  it('fetches audit logs on mount and renders records in table view', async () => {
    const wrapper = createWrapper();
    await flushPromises();

    expect(adminService.getAuditLogs).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      action: undefined,
      targetEntity: undefined,
      adminId: undefined,
      search: undefined,
    });

    // Check table headers
    expect(wrapper.text()).toContain('Admin Pelaksana');
    expect(wrapper.text()).toContain('Tindakan (Action)');
    expect(wrapper.text()).toContain('Entitas Target & ID');

    // Check rendered log records
    expect(wrapper.text()).toContain('Chief Moderator');
    expect(wrapper.text()).toContain('Super Admin');
    expect(wrapper.text()).toContain('Approve Aset');
    expect(wrapper.text()).toContain('Verifikasi Pembayaran');
    expect(wrapper.text()).toContain('Tolak Aset');
  });

  it('filters by category pills (e.g. Moderasi Aset)', async () => {
    const wrapper = createWrapper();
    await flushPromises();

    const moderationButton = wrapper.findAll('button').find((b) => b.text().includes('Moderasi Aset'));
    expect(moderationButton?.exists()).toBe(true);

    await moderationButton?.trigger('click');
    await flushPromises();

    expect(adminService.getAuditLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        targetEntity: 'assets',
        page: 1,
      })
    );
  });

  it('handles search input and submits query', async () => {
    const wrapper = createWrapper();
    await flushPromises();

    const searchInput = wrapper.find('input[placeholder*="Cari catatan"]');
    expect(searchInput.exists()).toBe(true);

    await searchInput.setValue('INV-20261002');
    await searchInput.trigger('keydown.enter');
    await flushPromises();

    expect(adminService.getAuditLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'INV-20261002',
        page: 1,
      })
    );
  });

  it('switches to timeline view mode', async () => {
    const wrapper = createWrapper();
    await flushPromises();

    const timelineButton = wrapper.findAll('button').find((b) => b.text().includes('Timeline'));
    expect(timelineButton?.exists()).toBe(true);

    await timelineButton?.trigger('click');
    await flushPromises();

    // In timeline view, relative track and timeline stream should exist
    expect(wrapper.find('.bg-gradient-to-b.from-primary').exists()).toBe(true);
  });

  it('opens detail inspection modal when "Inspeksi" is clicked', async () => {
    const wrapper = createWrapper();
    await flushPromises();

    const inspectButtons = wrapper.findAll('button').filter((b) => b.text().includes('Inspeksi'));
    expect(inspectButtons.length).toBeGreaterThan(0);

    await inspectButtons[0].trigger('click');
    await flushPromises();

    // Modal should be open
    expect(wrapper.text()).toContain('Inspeksi Catatan Audit');
    expect(wrapper.text()).toContain('Record ID: log-1');
    expect(wrapper.text()).toContain('Mutasi Nilai Data (Old vs New Values)');
    expect(wrapper.text()).toContain('Nilai Sebelumnya (Old Values)');
    expect(wrapper.text()).toContain('Nilai Sesudahnya (New Values)');

    // Close button
    const closeBtn = wrapper.findAll('button').find((b) => b.text().includes('Tutup'));
    expect(closeBtn?.exists()).toBe(true);
    await closeBtn?.trigger('click');
    await flushPromises();

    expect(wrapper.text()).not.toContain('Inspeksi Catatan Audit');
  });

  it('shows EmptyState when no logs match filters', async () => {
    (adminService.getAuditLogs as any).mockResolvedValueOnce({
      logs: [],
      pagination: { total: 0, page: 1, limit: 20, totalPages: 1 },
      stats: { totalActions: 0, totalApprovals: 0, totalRejections: 0, totalPayments: 0, totalUsersManaged: 0 },
      availableAdmins: [],
    });

    const wrapper = createWrapper();
    await flushPromises();

    expect(wrapper.find('.empty-state-stub').exists()).toBe(true);
    expect(wrapper.text()).toContain('Tidak Ada Catatan Audit yang Cocok');
  });
});
