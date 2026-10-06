import { execSync } from 'child_process';

const portsToFree =
  process.argv.slice(2).length > 0
    ? process.argv
        .slice(2)
        .map(Number)
        .filter((p) => !isNaN(p) && p > 0)
    : [3001, 3000];

console.log(`🔍 Checking and freeing ports: ${portsToFree.join(', ')}...`);

for (const port of portsToFree) {
  try {
    if (process.platform === 'win32') {
      let netstatOutput = '';
      try {
        netstatOutput = execSync(`netstat -ano | findstr :${port}`, {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'ignore'],
        });
      } catch {
        netstatOutput = '';
      }

      const lines = netstatOutput
        .split('\n')
        .filter((line) => line.includes('LISTENING') || line.includes(`:${port}`));
      const pids = new Set<string>();

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0' && !isNaN(Number(pid))) {
          pids.add(pid);
        }
      }

      if (pids.size === 0) {
        console.log(`✅ Port ${port} is already free.`);
      } else {
        for (const pid of pids) {
          try {
            execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
            console.log(`🛑 Successfully killed PID ${pid} holding port ${port}.`);
          } catch {
            console.warn(`⚠️ Could not terminate PID ${pid} (it may have already exited).`);
          }
        }
        console.log(`✅ Port ${port} is now free.`);
      }
    } else {
      // Unix / macOS
      try {
        const pids = execSync(`lsof -ti :${port}`, {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'ignore'],
        }).trim();
        if (pids) {
          execSync(`kill -9 ${pids.split('\n').join(' ')}`);
          console.log(`🛑 Killed processes on port ${port}: ${pids}`);
        } else {
          console.log(`✅ Port ${port} is already free.`);
        }
      } catch {
        console.log(`✅ Port ${port} is already free.`);
      }
    }
  } catch (err: any) {
    console.error(`⚠️ Error while freeing port ${port}:`, err.message);
  }
}
