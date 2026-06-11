import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Categories
  const categories = [
    { name: 'Cement & Concrete', slug: 'cement-concrete', description: 'All types of cement, concrete mix, and related products' },
    { name: 'Steel & Iron', slug: 'steel-iron', description: 'TMT bars, steel sheets, iron rods and structural steel' },
    { name: 'Bricks & Blocks', slug: 'bricks-blocks', description: 'Red bricks, AAC blocks, fly ash bricks, and more' },
    { name: 'Sand & Aggregates', slug: 'sand-aggregates', description: 'River sand, M-sand, gravel, and crushed stone' },
    { name: 'Wood & Timber', slug: 'wood-timber', description: 'Plywood, hardwood, softwood, and engineered wood' },
    { name: 'Roofing', slug: 'roofing', description: 'Roofing sheets, tiles, waterproofing materials' },
    { name: 'Plumbing', slug: 'plumbing', description: 'Pipes, fittings, valves and plumbing accessories' },
    { name: 'Electrical', slug: 'electrical', description: 'Wires, cables, switches, and electrical components' },
    { name: 'Paints & Coatings', slug: 'paints-coatings', description: 'Exterior, interior paints and protective coatings' },
    { name: 'Glass & Glazing', slug: 'glass-glazing', description: 'Float glass, toughened glass, and glazing systems' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: { ...cat, isActive: true },
    });
  }

  console.log(`✅ Created ${categories.length} categories`);
  console.log('🎉 Seed completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
