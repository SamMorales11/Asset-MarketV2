const TEST_URLS = [
  { name: 'Atelier Noir', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80' },
  { name: 'Chronos Trading', url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80' },
  { name: 'Vogue Interior 3D', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80' },
  { name: 'Aura Typography', url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=800&q=80' },
  { name: 'Lumina SaaS Dashboard', url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80' },
  { name: 'Cyberpunk Character', url: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=800&q=80' },
  { name: 'Hyperion E-Commerce', url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80' },
  { name: 'Obsidian Icons', url: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80' },
  { name: 'Cinematic Audio', url: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=800&q=80' },
  { name: 'Zenith Banking Mobile', url: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=800&q=80' },
  { name: 'Prism Glass 3D', url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80' },
  { name: 'Quantum Agency Next.js', url: 'https://images.unsplash.com/photo-1522542550221-31fd19575a2d?auto=format&fit=crop&w=800&q=80' },
  { name: 'Wireframe Kit (FREE)', url: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=800&q=80' },
  { name: 'Developer CLI Tools (FREE)', url: 'https://images.unsplash.com/photo-1629654297299-c8506221ca97?auto=format&fit=crop&w=800&q=80' },
  { name: 'Velvet Mirage (Pending)', url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80' },
];

async function testAll() {
  console.log(`Testing ${TEST_URLS.length} image URLs...`);
  for (const item of TEST_URLS) {
    try {
      const res = await fetch(item.url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
      const contentType = res.headers.get('content-type');
      console.log(`✓ [${res.status}] ${item.name}: ${contentType}`);
    } catch (err: any) {
      console.error(`✗ [ERROR] ${item.name}: ${err.message}`);
    }
  }
}

testAll();
