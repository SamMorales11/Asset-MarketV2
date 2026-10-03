import bcrypt from 'bcryptjs';
import { eq, isNull } from 'drizzle-orm';
import { db } from './index.js';
import { users, categories } from './schema.js';

interface SeedAccount {
  name: string;
  email: string;
  passwordRaw: string;
  role: 'superadmin' | 'admin' | 'user';
  isVerifiedSeller: boolean;
  phone?: string;
  bio?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
  bankBranch?: string;
}

const SEED_ACCOUNTS: SeedAccount[] = [
  {
    name: 'Super Admin',
    email: 'superadmin@assetmarket.com',
    passwordRaw: 'SuperAdmin123!',
    role: 'superadmin',
    isVerifiedSeller: true,
    phone: '+628110000001',
    bio: 'Platform Owner & Super Administrator with full system control and access audit rights.',
    bankName: 'Bank Central Asia (BCA)',
    bankAccountNumber: '8001122334',
    bankAccountHolder: 'Super Admin Asset Market',
    bankBranch: 'Jakarta Pusat',
  },
  {
    name: 'Admin Asset Market',
    email: 'admin@assetmarket.com',
    passwordRaw: 'Admin123!',
    role: 'admin',
    isVerifiedSeller: true,
    phone: '+628110000002',
    bio: 'Asset Reviewer, Verification Moderator, and Platform Support Specialist.',
    bankName: 'Bank Mandiri',
    bankAccountNumber: '102003040506',
    bankAccountHolder: 'Admin Asset Market',
    bankBranch: 'Thamrin Jakarta',
  },
  {
    name: 'Demo User',
    email: 'user@assetmarket.com',
    passwordRaw: 'User123!',
    role: 'user',
    isVerifiedSeller: true,
    phone: '+6281234567890',
    bio: 'Enthusiastic buyer and digital asset collector passionate about high-craft templates & codebases.',
    bankName: 'Bank Central Asia (BCA)',
    bankAccountNumber: '5270918234',
    bankAccountHolder: 'Demo User',
    bankBranch: 'Surabaya Gubeng',
  },
  {
    name: 'Demo Seller',
    email: 'seller@assetmarket.com',
    passwordRaw: 'Seller123!',
    role: 'user',
    isVerifiedSeller: true,
    phone: '+6281987654321',
    bio: 'Senior UI/UX Designer & 3D Artist creating award-winning design kits and interactive web systems.',
    bankName: 'Bank Negara Indonesia (BNI)',
    bankAccountNumber: '0388912389',
    bankAccountHolder: 'Demo Seller',
    bankBranch: 'Bandung Dago',
  },
];

const DEFAULT_CATEGORIES = [
  {
    name: 'UI & Web Templates',
    slug: 'ui-templates',
    description: 'Dashboard templates, landing pages, mobile UI kits, and design components.',
    iconUrl: 'layout',
  },
  {
    name: 'Source Code & Starters',
    slug: 'source-code',
    description: 'Full-stack applications, microservices, backend starters, and APIs.',
    iconUrl: 'code',
  },
  {
    name: '3D Models & Assets',
    slug: '3d-models',
    description: 'High-poly and low-poly 3D models, textures, rigs, and game-ready assets.',
    iconUrl: 'box',
  },
  {
    name: 'Graphics & Vector Kits',
    slug: 'graphics-vectors',
    description: 'Vector illustrations, icon packs, typography, and brand assets.',
    iconUrl: 'palette',
  },
  {
    name: 'Audio & Sound Effects',
    slug: 'audio-sound',
    description: 'Royalty-free music tracks, cinematic SFX, and ambient soundscapes.',
    iconUrl: 'music',
  },
];

async function runSeed() {
  console.log('\n=============================================');
  console.log('🌱 Starting Database Seeding on Neon PostgreSQL');
  console.log('=============================================\n');

  const results: Array<{
    name: string;
    email: string;
    password: string;
    role: string;
    status: 'CREATED' | 'ALREADY EXISTS';
  }> = [];

  try {
    // 1. Seed Accounts
    for (const account of SEED_ACCOUNTS) {
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.email, account.email))
        .limit(1);

      if (existing.length > 0) {
        results.push({
          name: account.name,
          email: account.email,
          password: account.passwordRaw,
          role: account.role,
          status: 'ALREADY EXISTS',
        });
      } else {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(account.passwordRaw, salt);

        await db.insert(users).values({
          name: account.name,
          email: account.email,
          passwordHash,
          role: account.role,
          isVerifiedSeller: account.isVerifiedSeller,
          phone: account.phone,
          bio: account.bio,
          bankName: account.bankName,
          bankAccountNumber: account.bankAccountNumber,
          bankAccountHolder: account.bankAccountHolder,
          bankBranch: account.bankBranch,
        });

        results.push({
          name: account.name,
          email: account.email,
          password: account.passwordRaw,
          role: account.role,
          status: 'CREATED',
        });
      }
    }

    // 2. Seed Default Categories if empty
    const existingCats = await db
      .select()
      .from(categories)
      .where(isNull(categories.deletedAt));

    let categoriesStatus = 'Already populated';
    if (existingCats.length === 0) {
      await db.insert(categories).values(DEFAULT_CATEGORIES);
      categoriesStatus = `Created ${DEFAULT_CATEGORIES.length} default categories`;
    }

    // 3. Print Results Summary
    console.log('📊 Seeding Summary - Test Accounts:');
    console.table(
      results.map((r) => ({
        Name: r.name,
        Email: r.email,
        Password: r.password,
        Role: r.role,
        Status: r.status,
      }))
    );

    console.log(`📁 Categories Status: ${categoriesStatus} (${DEFAULT_CATEGORIES.length} total)`);
    console.log('\n✨ Database seeding completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed with error:', error);
    process.exit(1);
  }
}

runSeed();
