import { createAdaptorServer } from '@hono/node-server';
import * as dotenv from 'dotenv';
import { app } from './app.js';
import type { AddressInfo } from 'node:net';

dotenv.config();

const DEFAULT_PORT = 3001;
const requestedPort = Number(process.env.PORT) || DEFAULT_PORT;
const allowFallback = process.env.AUTO_PORT_FALLBACK === 'true';

function startServer(port: number, retryCount = 0) {
  const server = createAdaptorServer({
    fetch: app.fetch,
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      if (allowFallback && retryCount < 3) {
        const nextPort = port + 1;
        console.warn(`⚠️  Port ${port} in use. Attempting fallback to port ${nextPort}...`);
        startServer(nextPort, retryCount + 1);
        return;
      }

      console.error('\n' + '='.repeat(68));
      console.error(`🚨 PORT CONFLICT: Port ${port} is already in use by another process.`);
      console.error('='.repeat(68));
      console.error('\nTo free the port and resolve this conflict:');
      console.error(`  👉 Run: npm run port:free`);
      console.error(`  👉 Or run (PowerShell): Stop-Process -Id (Get-NetTCPConnection -LocalPort ${port}).OwningProcess -Force`);
      console.error(`  👉 Or configure PORT in .env (e.g. PORT=3002)\n`);
      console.error('='.repeat(68) + '\n');
      process.exit(1);
    } else {
      console.error('❌ Server startup error:', err);
      process.exit(1);
    }
  });

  server.listen(port, () => {
    const address = server.address() as AddressInfo;
    const actualPort = address?.port || port;
    console.log(`\n✨ ==============================================`);
    console.log(`🚀 Asset Market API Server running at: http://localhost:${actualPort}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 API Base:    http://localhost:${actualPort}/api`);
    console.log(`==============================================\n`);
  });

  const handleTermination = () => {
    server.close(() => {
      process.exit(0);
    });
  };

  process.once('SIGINT', handleTermination);
  process.once('SIGTERM', handleTermination);
}

startServer(requestedPort);
