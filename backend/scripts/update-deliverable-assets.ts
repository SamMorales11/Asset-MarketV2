import { db } from '../src/db/index.js';
import { assets } from '../src/db/schema.js';
import { ilike, eq } from 'drizzle-orm';

interface ProductPreset {
  title: string;
  slugBase: string;
  shortDescription: string;
  description: string;
  thumbnailUrl: string;
}

const CREATIVE_PRODUCTS: ProductPreset[] = [
  {
    title: 'Apex Enterprise UI Kit & Design System',
    slugBase: 'apex-enterprise-ui-kit',
    shortDescription: 'Production-ready enterprise UI kit with modular Vue components, design tokens, and multi-format deliverable assets.',
    description: 'A complete design and development kit built for modern web applications. Features over 70 accessible components, dark and light mode tokens, responsive layout grids, interactive states, and comprehensive Figma deliverable files.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Nexus SaaS Dark-Mode Analytics Dashboard',
    slugBase: 'nexus-saas-dark-analytics-dashboard',
    shortDescription: 'Full-featured analytics and admin dashboard template optimized for SaaS metrics and telemetry.',
    description: 'Engineered for high-density SaaS interfaces. Contains customizable charts, real-time data table components, authorization flows, customer segmentation cards, and clean modular Vue 3 composition code.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Quantum Flow E-Commerce Experience Kit',
    slugBase: 'quantum-flow-ecommerce-kit',
    shortDescription: 'Conversion-optimized digital commerce components and checkout flows for creative brands.',
    description: 'An editorial e-commerce template featuring fluid responsive typography, micro-interactions, seamless checkout funnels, cart slide-overs, and frictionless payment states.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Obsidian Modular Design System Pro',
    slugBase: 'obsidian-modular-design-system-pro',
    shortDescription: 'Architectural component library with automated Figma tokens, documentation, and zero-dependency styles.',
    description: 'A clean architectural design system engineered for maximum consistency and brand expression. Includes standardized spacing tokens, WCAG AA color palettes, and production-tested layouts.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Solaria Mobile Banking & FinTech UI Suite',
    slugBase: 'solaria-mobile-fintech-ui-suite',
    shortDescription: 'Next-generation financial technology interface patterns, card managers, and digital wallet components.',
    description: 'Built for secure banking applications and fintech platforms. Includes biometric authentication views, spending breakdown charts, multi-currency transaction feeds, and instant transfer flows.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Hyperion Headless Multi-Tenant Studio',
    slugBase: 'hyperion-headless-multitenant-studio',
    shortDescription: 'Scalable frontend workspace template for enterprise multi-tenant cloud applications.',
    description: 'An enterprise-grade workspace starter equipped with workspace switching, audit log tables, role-based access control modals, and high-performance server-rendered pages.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Vanguard Creative Portfolio & Studio CMS',
    slugBase: 'vanguard-creative-portfolio-cms',
    shortDescription: 'Minimalist brutalist portfolio and editorial showcase for creative agencies and independent designers.',
    description: 'High-impact editorial portfolio template featuring smooth scroll kinematics, dynamic project grids, interactive case study layouts, and responsive media galleries.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Aura 3D Spatial Visualization Toolkit',
    slugBase: 'aura-3d-spatial-visualization-toolkit',
    shortDescription: 'Modern WebGL and 3D visualization scene templates with interactive lighting and materials.',
    description: 'A curated spatial design collection designed for immersive web experiences. Features optimized asset bundles, glTF models, custom shader presets, and pre-configured camera controls.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Krypton Crypto & Web3 Trading Terminal',
    slugBase: 'krypton-crypto-web3-trading-terminal',
    shortDescription: 'Ultra-low-latency financial trading UI with candlestick charting and orderbook depth graphs.',
    description: 'Built for active traders and market makers. Delivers modular candlestick chart widgets, depth-of-market tables, position monitors, and WebSocket-ready state structures.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Prism Dynamic Typography & Editorial Layouts',
    slugBase: 'prism-dynamic-typography-editorial-layouts',
    shortDescription: 'Expressive editorial grid system with bespoke typographic pairings and magazine-grade layouts.',
    description: 'A publication-ready layout toolkit designed for luxury storytelling, long-form editorial content, and cultural magazines. Includes drop-caps, pull quotes, and adaptive columns.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1522542550221-31fd19575a2d?auto=format&fit=crop&w=1200&q=80',
  },
];

async function updateDeliverableAssets() {
  console.log('Connecting to database and finding assets starting with "Deliverable Asset"...');

  const targets = await db
    .select({
      id: assets.id,
      title: assets.title,
      slug: assets.slug,
      thumbnailUrl: assets.thumbnailUrl,
    })
    .from(assets)
    .where(ilike(assets.title, 'Deliverable Asset%'));

  console.log(`Found ${targets.length} asset(s) to update.`);

  if (targets.length === 0) {
    console.log('No assets found matching "Deliverable Asset%". Nothing to update.');
    process.exit(0);
  }

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i]!;
    const preset = CREATIVE_PRODUCTS[i % CREATIVE_PRODUCTS.length]!;
    const shortId = target.id.replace(/-/g, '').slice(0, 6);
    const newSlug = `${preset.slugBase}-${shortId}`;

    console.log(`\n[${i + 1}/${targets.length}] Updating asset: ${target.id}`);
    console.log(`  Old Title: "${target.title}"`);
    console.log(`  New Title: "${preset.title}"`);
    console.log(`  New Slug:  "${newSlug}"`);
    console.log(`  New Thumb: "${preset.thumbnailUrl}"`);

    await db
      .update(assets)
      .set({
        title: preset.title,
        slug: newSlug,
        shortDescription: preset.shortDescription,
        description: preset.description,
        thumbnailUrl: preset.thumbnailUrl,
        previewImages: [preset.thumbnailUrl],
        updatedAt: new Date(),
      })
      .where(eq(assets.id, target.id));
  }

  console.log('\nAll deliverable assets updated successfully without deleting any data!');
  process.exit(0);
}

updateDeliverableAssets().catch((err) => {
  console.error('Error updating deliverable assets:', err);
  process.exit(1);
});
