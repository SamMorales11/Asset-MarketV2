export type UserRole = 'user' | 'admin' | 'superadmin';
export type AssetStatus = 'pending' | 'approved' | 'rejected';
export type AssetType =
  | 'source_code'
  | 'ui_template'
  | '3d_model'
  | 'graphic'
  | 'audio'
  | 'video'
  | 'document'
  | 'other';

export type TransactionStatus =
  | 'pending'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'expired';

export type PaymentConfirmationStatus = 'pending' | 'verified' | 'rejected';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  phone?: string | null;
  bio?: string | null;
  role: UserRole;
  isVerifiedSeller: boolean;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankAccountHolder?: string | null;
  bankBranch?: string | null;
  bankSwiftOrCode?: string | null;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  iconUrl?: string | null;
  parentId?: string | null;
  isActive: boolean;
  assetCount?: number;
}

export interface AssetFile {
  id: string;
  assetId?: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  fileExtension?: string;
  version: string;
  isMain?: boolean;
  downloadUrl?: string;
}

export interface Asset {
  id: string;
  sellerId: string;
  categoryId: string;
  title: string;
  slug: string;
  shortDescription?: string | null;
  description: string;
  assetType: AssetType;
  status: AssetStatus;
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  price: number;
  discountPrice?: number | null;
  currency: string;
  thumbnailUrl: string;
  coverUrl?: string;
  imageUrl?: string;
  cover_url?: string;
  image_url?: string;
  previewImages?: string[];
  demoUrl?: string | null;
  tags: string[];
  downloadCount: number;
  viewCount: number;
  ratingAvg: number;
  ratingCount: number;
  seller?: {
    id: string;
    name: string;
    email?: string;
    avatarUrl?: string | null;
    bio?: string | null;
    isVerifiedSeller?: boolean;
    createdAt?: string;
  };
  category?: Category;
  files?: AssetFile[];
  createdAt: string;
  updatedAt?: string;
}

export interface CartItem {
  id: string;
  cartItemId?: string;
  assetId: string;
  asset: Asset;
  effectivePrice?: number;
  price?: number;
  priceAtAddition?: number;
  addedAt?: string;
}

export interface Transaction {
  id: string;
  invoiceNumber: string;
  buyerId: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: TransactionStatus;
  paymentMethod: string;
  paidAt?: string | null;
  expiresAt?: string | null;
  notes?: string | null;
  createdAt: string;
  isExpired?: boolean;
}

export interface TransactionItem {
  id: string;
  assetId: string;
  price: number;
  sellerRatePercent: number;
  platformRatePercent: number;
  sellerAmount: number;
  platformAmount: number;
  licenseType: string;
  asset: {
    id: string;
    title: string;
    slug: string;
    shortDescription?: string | null;
    thumbnailUrl: string;
    assetType: AssetType;
  };
  seller: {
    id: string;
    name: string;
  };
}

export interface DestinationBankAccount {
  bank: string;
  bankName: string;
  accountNumber: string;
  formattedAccountNumber: string;
  accountHolder: string;
  badge?: string;
  instructions: string;
}

export interface PaymentConfirmation {
  id: string;
  senderBank: string;
  senderAccountNumber: string;
  senderAccountName: string;
  destinationBank: string;
  transferAmount: number;
  transferDate: string;
  proofImageUrl: string;
  status: PaymentConfirmationStatus;
  rejectionReason?: string | null;
  verifiedAt?: string | null;
  createdAt: string;
}

export interface PurchasedAsset {
  transactionId: string;
  invoiceNumber: string;
  paidAt: string;
  purchaseDate: string;
  pricePaid: number;
  licenseType: string;
  asset: Asset & {
    files: Array<AssetFile & { downloadUrl: string }>;
  };
}

export interface UnifiedTransactionItem {
  id: string;
  transactionId: string;
  invoiceNumber: string;
  role: 'buyer' | 'seller';
  type: 'purchase' | 'sale';
  status: TransactionStatus;
  assetTitle: string;
  assetThumbnail: string;
  assetType: AssetType;
  assetSlug: string;
  grossAmount: number;
  netAmount: number;
  platformFee: number;
  counterpartyName: string;
  paymentMethod: string;
  createdAt: string;
  paidAt?: string | null;
  itemsCount: number;
}

export interface RevenueLedgerItem {
  id: string;
  entryType: 'sale_earning' | 'platform_commission' | 'withdrawal' | 'refund' | 'adjustment';
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
  transactionId?: string | null;
}

export interface RevenueData {
  summary: {
    grossSales: number;
    creatorEarnings: number; // 60%
    platformFees: number; // 40%
    pendingEarnings: number;
    availableBalance: number;
    withdrawnTotal: number;
    totalSalesVolume: number;
  };
  bankAccount: {
    bankName?: string | null;
    bankAccountNumber?: string | null;
    bankAccountHolder?: string | null;
    bankBranch?: string | null;
    isVerifiedSeller: boolean;
  };
  payoutInfo: {
    minimumWithdrawal: number;
    canWithdraw: boolean;
    processingTime: string;
    payoutSchedule: string;
  };
  ledgerEntries: RevenueLedgerItem[];
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: unknown;
}

export interface DashboardSummary {
  profile: User;
  counts: {
    myListings: {
      total: number;
      approved: number;
      pending: number;
      rejected: number;
    };
    purchasedAssetsCount: number;
    totalSalesCount: number;
  };
  revenue: {
    grossSales: number;
    creatorEarnings: number;
    platformFees: number;
    withdrawnAmount: number;
    pendingWithdrawal: number;
    availableBalance: number;
    totalSpent: number;
  };
  bankAccountConfigured: boolean;
  recentTransactions: Array<{
    id: string;
    invoiceNumber: string;
    role: 'buyer' | 'seller';
    title: string;
    assetType?: string;
    amount: number;
    status: string;
    createdAt: string;
  }>;
  recentListings: Array<{
    id: string;
    title: string;
    slug: string;
    status: AssetStatus;
    price: string | number;
    assetType: AssetType;
    thumbnailUrl: string;
    downloadCount: number;
    createdAt: string;
  }>;
}

export interface PaymentSettings {
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountHolder: string | null;
  bankBranch?: string | null;
  bankSwiftOrCode?: string | null;
  isConfigured: boolean;
  isVerifiedSeller: boolean;
}

export interface UpdateProfilePayload {
  name: string;
  bio?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
}

export interface AdminDashboardData {
  stats: {
    pendingAssetsCount: number;
    pendingPaymentsCount: number;
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    sellersCount: number;
    adminCount: number;
    totalTransactions: number;
    paidTransactionsCount: number;
    processingTransactionsCount: number;
    pendingTransactionsCount: number;
    rejectedTransactionsCount: number;
    revenue: {
      grossVolume: number;
      platformRevenue: number;
      creatorPayouts: number;
    };
  };
  recentTransactions: Array<{
    id: string;
    invoiceNumber: string;
    totalAmount: string | number;
    status: string;
    createdAt: string;
    buyer?: {
      id: string;
      name: string;
      email: string;
    } | null;
  }>;
  recentUsers: Array<{
    id: string;
    name: string;
    email: string;
    role: UserRole;
    isVerifiedSeller: boolean;
    avatarUrl?: string | null;
    createdAt: string;
    deletedAt?: string | null;
  }>;
  recentAuditLogs: Array<{
    id: string;
    action: string;
    targetEntity: string;
    targetId: string;
    notes?: string | null;
    createdAt: string;
    adminName?: string | null;
  }>;
}

export interface AdminUserListItem extends User {
  isActive: boolean;
  deletedAt?: string | null;
  stats: {
    assetsCount: number;
    purchasesCount: number;
    salesCount: number;
    totalEarned: number;
  };
}

export interface AdminUsersResponse {
  users: AdminUserListItem[];
  pagination: Pagination;
}

export interface AdminUserDetail {
  user: User & { isActive: boolean; deletedAt?: string | null; updatedAt?: string | null };
  financialSummary: {
    grossSales: number;
    creatorEarnings: number;
    availableBalance: number;
  };
  assets: Array<{
    id: string;
    title: string;
    slug: string;
    status: AssetStatus;
    price: string | number;
    assetType: AssetType;
    downloadCount: number;
    thumbnailUrl: string;
    createdAt: string;
  }>;
  buyerTransactions: Array<{
    id: string;
    invoiceNumber: string;
    totalAmount: string | number;
    status: string;
    createdAt: string;
  }>;
  sellerItems: Array<{
    id: string;
    price: string | number;
    sellerAmount: string | number;
    platformAmount: string | number;
    invoiceNumber: string;
    status: string;
    createdAt: string;
    assetTitle: string;
  }>;
  ledgerEntries: RevenueLedgerItem[];
}

export interface AdminSellerRevenueItem {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    isVerifiedSeller: boolean;
    avatarUrl?: string | null;
    bankName?: string | null;
    bankAccountNumber?: string | null;
    bankAccountHolder?: string | null;
    createdAt: string;
  };
  assetsCount: number;
  totalSalesCount: number;
  grossSales: number;
  creatorEarnings: number;
  platformShareGenerated: number;
  totalWithdrawn: number;
  availableBalance: number;
  bankConfigured: boolean;
}

export interface AdminRevenueResponse {
  summary: {
    totalPlatformRevenue: number;
    totalCreatorEarnings: number;
    totalGrossSales: number;
    totalWithdrawnAll: number;
    sellersCount: number;
  };
  sellers: AdminSellerRevenueItem[];
}

export interface AdminUserRevenueDetail {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    isVerifiedSeller: boolean;
    bankName?: string | null;
    bankAccountNumber?: string | null;
    bankAccountHolder?: string | null;
  };
  financials: {
    grossSales: number;
    creatorEarnings: number;
    platformShareGenerated: number;
    totalWithdrawn: number;
    availableBalance: number;
  };
  sales: Array<{
    id: string;
    price: string | number;
    sellerAmount: string | number;
    platformAmount: string | number;
    invoiceNumber: string;
    status: string;
    createdAt: string;
    assetTitle: string;
    assetType: AssetType;
  }>;
  ledgerEntries: RevenueLedgerItem[];
}

export interface AdminAccountItem {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'superadmin';
  isVerifiedSeller: boolean;
  avatarUrl?: string | null;
  phone?: string | null;
  bio?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  isActive: boolean;
  actionsCount: number;
}

export interface AdminActionAuditLog {
  id: string;
  action: string;
  targetEntity: string;
  targetId: string;
  notes?: string | null;
  createdAt: string;
}

export interface AuditTrailLogItem {
  id: string;
  adminId: string;
  action: string;
  targetEntity: string;
  targetId: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
  notes?: string | null;
  createdAt: string;
  adminName?: string | null;
  adminEmail?: string | null;
  adminRole?: string | null;
  adminAvatarUrl?: string | null;
}

export interface AuditTrailStats {
  totalActions: number;
  totalApprovals: number;
  totalRejections: number;
  totalPayments: number;
  totalUsersManaged: number;
}

export interface AuditTrailResponse {
  logs: AuditTrailLogItem[];
  pagination: Pagination;
  stats: AuditTrailStats;
  availableAdmins: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
  }>;
}

export interface AdminAccountDetail {
  admin: AdminAccountItem;
  actions: AdminActionAuditLog[];
}

export interface CreateAdminPayload {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'superadmin';
  phone?: string | null;
  bio?: string | null;
}

export interface UpdateAdminPayload {
  name?: string;
  email?: string;
  password?: string | null;
  role?: 'admin' | 'superadmin';
  phone?: string | null;
  bio?: string | null;
}



