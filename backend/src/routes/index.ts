import { Hono } from 'hono';
import { authRoutes } from './auth.js';
import { categoryRoutes } from './categories.js';
import { assetRoutes } from './assets.js';
import { adminRoutes } from './admin.js';
import { cartRoutes } from './cart.js';
import { transactionRoutes } from './transactions.js';
import { userRoutes } from './users.js';

export const apiRoutes = new Hono();

// Mount Modular Sub-Routers
apiRoutes.route('/auth', authRoutes);
apiRoutes.route('/categories', categoryRoutes);
apiRoutes.route('/assets', assetRoutes);
apiRoutes.route('/admin', adminRoutes);
apiRoutes.route('/cart', cartRoutes);
apiRoutes.route('/users', userRoutes);
apiRoutes.route('/', transactionRoutes); // mounts /checkout, /transactions/:invoiceNumber, /payments/confirm, /purchases/my

apiRoutes.get('/', (c) => {
  return c.json({
    message: 'Welcome to Asset Market API',
    version: '1.0.0',
    endpoints: [
      '/api/auth',
      '/api/categories',
      '/api/assets',
      '/api/admin',
      '/api/cart',
      '/api/checkout',
      '/api/transactions/:invoiceNumber',
      '/api/payments/confirm',
      '/api/purchases/my',
      '/api/users/me/assets',
      '/api/users/me/transactions',
      '/api/users/me/revenue',
    ],
  });
});
