/**
 * BuildX database seed — run with:
 *   npx ts-node -r tsconfig-paths/register src/scripts/seed.ts
 *
 * Seeds: 10 categories, 2 supplier profiles + users, 30 products across categories
 * All data is Tumakuru, Karnataka context.
 */

import '../config/env';
import mongoose from 'mongoose';
import { env } from '../config/env';
import { Category } from '../infrastructure/database/models/Category.model';
import { User } from '../infrastructure/database/models/User.model';
import { SupplierProfile } from '../infrastructure/database/models/SupplierProfile.model';
import { Product } from '../infrastructure/database/models/Product.model';

// ─── helpers ────────────────────────────────────────────────────────────────

function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function uniqueSlug(base: string) {
  let s = base; let i = 0;
  while (await Product.exists({ slug: s })) s = `${base}-${++i}`;
  return s;
}

// ─── categories ─────────────────────────────────────────────────────────────

const CATEGORIES = [
  { name: 'Cement & Concrete',   icon: '🏗️',  description: 'OPC, PPC, white cement, ready-mix concrete',         sortOrder: 1 },
  { name: 'Bricks & Blocks',     icon: '🧱',  description: 'Red bricks, fly ash bricks, AAC blocks, CC blocks',   sortOrder: 2 },
  { name: 'Sand & Aggregates',   icon: '⛏️',  description: 'M sand, P sand, river sand, jelly 20mm/40mm',         sortOrder: 3 },
  { name: 'Steel & TMT Bars',    icon: '🔩',  description: 'TMT bars 8mm–32mm, binding wire, MS angles',          sortOrder: 4 },
  { name: 'Plumbing',            icon: '🔧',  description: 'PVC pipes, CPVC, fittings, tanks, water pumps',        sortOrder: 5 },
  { name: 'Electricals',         icon: '⚡',  description: 'Wires, switchgear, conduits, MCBs, DB boxes',         sortOrder: 6 },
  { name: 'Paints & Chemicals',  icon: '🎨',  description: 'Exterior, interior, waterproofing, putty, primers',   sortOrder: 7 },
  { name: 'Plywood & Timber',    icon: '🪵',  description: 'Commercial plywood, hardwood, softwood, veneers',     sortOrder: 8 },
  { name: 'Machines & Tools',    icon: '⚙️',  description: 'Concrete mixers, vibrators, scaffolding, hand tools', sortOrder: 9 },
  { name: 'Tiles & Flooring',    icon: '🪟',  description: 'Ceramic, vitrified, granite, marble, adhesives',      sortOrder: 10 },
];

// ─── supplier users (no firebaseUid — use placeholder for seed) ─────────────

const SUPPLIER_USERS = [
  {
    phone: '+919876543201',
    firebaseUid: 'seed-supplier-uid-1',
    name: 'Ramappa Gowda',
    role: 'SUPPLIER' as const,
    onboardingComplete: true,
  },
  {
    phone: '+919876543202',
    firebaseUid: 'seed-supplier-uid-2',
    name: 'Lakshmi Narayana',
    role: 'SUPPLIER' as const,
    onboardingComplete: true,
  },
];

const SUPPLIER_PROFILES = [
  {
    businessName: 'Ramappa Sand & Aggregates',
    description: 'Premium quality river sand, M sand, and aggregates sourced from licensed quarries near Tumakuru. Serving construction sites across Tumakuru district since 2008.',
    categories: ['Sand & Aggregates', 'Cement & Concrete'],
    deliveryRadiusKm: 50,
    serviceAreas: ['Tumakuru', 'Tiptur', 'Madhugiri', 'Pavagada', 'Sira'],
    whatsappNumber: '+919876543201',
    verificationStatus: 'VERIFIED' as const,
    avgRating: 4.6,
    totalReviews: 87,
    totalDeliveries: 312,
  },
  {
    businessName: 'Sri Venkateshwara Building Materials',
    description: 'One-stop shop for all construction materials in Tumakuru. Authorised dealer for UltraTech Cement, Tata Tiscon, and JSW Steel. GST compliant, fast delivery.',
    categories: ['Cement & Concrete', 'Steel & TMT Bars', 'Bricks & Blocks'],
    deliveryRadiusKm: 40,
    serviceAreas: ['Tumakuru', 'Gubbi', 'Kunigal', 'Koratagere'],
    whatsappNumber: '+919876543202',
    verificationStatus: 'VERIFIED' as const,
    avgRating: 4.8,
    totalReviews: 143,
    totalDeliveries: 528,
  },
];

// ─── products ────────────────────────────────────────────────────────────────

function makeProducts(
  supplierProfileId: mongoose.Types.ObjectId,
  catMap: Record<string, mongoose.Types.ObjectId>
) {
  return [
    // ── CEMENT ──
    {
      supplierId: supplierProfileId,
      categoryId: catMap['Cement & Concrete'],
      name: 'UltraTech OPC 53 Grade Cement',
      description: 'UltraTech OPC 53 Grade cement is ideal for RCC structures, pre-stressed concrete, and all high-strength applications. Superior early strength gain. 50 kg bag.',
      shortDescription: 'High-strength OPC cement for RCC and structural work',
      unit: 'BAG',
      basePrice: 380,
      gstRate: 28,
      isGstInclusive: false,
      stockQuantity: 2000,
      minOrderQuantity: 10,
      deliveryDays: 1,
      tags: ['cement', 'opc', 'ultratech', 'rcc', '53-grade'],
      status: 'ACTIVE',
      isFeatured: true,
      images: [{ url: 'https://res.cloudinary.com/buildx/image/upload/v1/products/cement-ultratech.jpg', publicId: 'products/cement-ultratech', isPrimary: true, sortOrder: 0 }],
    },
    {
      supplierId: supplierProfileId,
      categoryId: catMap['Cement & Concrete'],
      name: 'Ambuja PPC Cement',
      description: 'Ambuja Portland Pozzolana Cement offers excellent durability and resistance to sulphate attack. Ideal for plastering, brickwork, and general construction. 50 kg bag.',
      shortDescription: 'Durable PPC cement for plastering and brickwork',
      unit: 'BAG',
      basePrice: 360,
      gstRate: 28,
      isGstInclusive: false,
      stockQuantity: 1500,
      minOrderQuantity: 10,
      deliveryDays: 1,
      tags: ['cement', 'ppc', 'ambuja', 'plastering'],
      status: 'ACTIVE',
      images: [{ url: 'https://res.cloudinary.com/buildx/image/upload/v1/products/cement-ambuja.jpg', publicId: 'products/cement-ambuja', isPrimary: true, sortOrder: 0 }],
    },

    // ── BRICKS ──
    {
      supplierId: supplierProfileId,
      categoryId: catMap['Bricks & Blocks'],
      name: 'Red Clay Bricks — Grade A',
      description: 'High-quality red clay bricks kiln-fired at 900°C. Uniform size, low water absorption, high compressive strength. Ideal for load-bearing walls and facades.',
      shortDescription: 'Grade A kiln-fired red clay bricks for structural work',
      unit: 'PIECE',
      basePrice: 8,
      gstRate: 5,
      isGstInclusive: false,
      stockQuantity: 50000,
      minOrderQuantity: 1000,
      deliveryDays: 2,
      tags: ['bricks', 'red-brick', 'clay', 'load-bearing'],
      status: 'ACTIVE',
      isFeatured: true,
      images: [{ url: 'https://res.cloudinary.com/buildx/image/upload/v1/products/brick-red.jpg', publicId: 'products/brick-red', isPrimary: true, sortOrder: 0 }],
    },
    {
      supplierId: supplierProfileId,
      categoryId: catMap['Bricks & Blocks'],
      name: 'Fly Ash Bricks — 230×115×75mm',
      description: 'Eco-friendly fly ash bricks with superior thermal insulation, uniform dimensions, and low cost. Compliant with IS 12894:2002. No plaster needed for interior walls.',
      shortDescription: 'Eco-friendly fly ash bricks with thermal insulation',
      unit: 'PIECE',
      basePrice: 6.5,
      gstRate: 5,
      isGstInclusive: false,
      stockQuantity: 80000,
      minOrderQuantity: 500,
      deliveryDays: 2,
      tags: ['bricks', 'fly-ash', 'eco-friendly', 'thermal'],
      status: 'ACTIVE',
      images: [{ url: 'https://res.cloudinary.com/buildx/image/upload/v1/products/brick-flyash.jpg', publicId: 'products/brick-flyash', isPrimary: true, sortOrder: 0 }],
    },
    {
      supplierId: supplierProfileId,
      categoryId: catMap['Bricks & Blocks'],
      name: 'AAC Blocks — 600×200×100mm',
      description: 'Autoclaved Aerated Concrete blocks — lightweight, excellent thermal insulation, easy to cut. Reduces overall load on structure by 40%. For framed structures only.',
      shortDescription: 'Lightweight AAC blocks, reduces structural load by 40%',
      unit: 'PIECE',
      basePrice: 42,
      gstRate: 12,
      isGstInclusive: false,
      stockQuantity: 5000,
      minOrderQuantity: 100,
      deliveryDays: 3,
      tags: ['blocks', 'aac', 'lightweight', 'thermal-insulation'],
      status: 'ACTIVE',
      images: [{ url: 'https://res.cloudinary.com/buildx/image/upload/v1/products/block-aac.jpg', publicId: 'products/block-aac', isPrimary: true, sortOrder: 0 }],
    },

    // ── SAND ──
    {
      supplierId: supplierProfileId,
      categoryId: catMap['Sand & Aggregates'],
      name: 'M Sand (Manufactured Sand)',
      description: 'KSPCB-approved manufactured sand, a substitute for river sand. Free of organic impurities, consistent gradation, ideal for plastering, concrete, and masonry work.',
      shortDescription: 'KSPCB-approved M sand for concrete and plastering',
      unit: 'TON',
      basePrice: 900,
      gstRate: 5,
      isGstInclusive: false,
      stockQuantity: 500,
      minOrderQuantity: 1,
      deliveryDays: 1,
      tags: ['sand', 'm-sand', 'manufactured-sand', 'plastering'],
      status: 'ACTIVE',
      isFeatured: true,
      images: [{ url: 'https://res.cloudinary.com/buildx/image/upload/v1/products/sand-m.jpg', publicId: 'products/sand-m', isPrimary: true, sortOrder: 0 }],
    },
    {
      supplierId: supplierProfileId,
      categoryId: catMap['Sand & Aggregates'],
      name: 'P Sand (Plastering Sand)',
      description: 'Fine-grade plastering sand with particles sized 150–600 microns. Superior smoothness for wall plastering, floor screeding, and tile bedding.',
      shortDescription: 'Fine P sand for smooth wall and floor plastering',
      unit: 'TON',
      basePrice: 1100,
      gstRate: 5,
      isGstInclusive: false,
      stockQuantity: 300,
      minOrderQuantity: 1,
      deliveryDays: 1,
      tags: ['sand', 'p-sand', 'plastering', 'fine-sand'],
      status: 'ACTIVE',
      images: [{ url: 'https://res.cloudinary.com/buildx/image/upload/v1/products/sand-p.jpg', publicId: 'products/sand-p', isPrimary: true, sortOrder: 0 }],
    },
    {
      supplierId: supplierProfileId,
      categoryId: catMap['Sand & Aggregates'],
      name: 'Jelly 20mm — Crushed Granite',
      description: 'Crushed granite coarse aggregate 20mm graded as per IS 383. Used for RCC work, foundations, and road construction. Sourced from licensed quarries near Tumakuru.',
      shortDescription: '20mm crushed granite aggregate for RCC and foundations',
      unit: 'TON',
      basePrice: 1400,
      gstRate: 5,
      isGstInclusive: false,
      stockQuantity: 400,
      minOrderQuantity: 1,
      deliveryDays: 1,
      tags: ['aggregate', 'jelly', '20mm', 'granite', 'rcc'],
      status: 'ACTIVE',
      images: [{ url: 'https://res.cloudinary.com/buildx/image/upload/v1/products/jelly-20mm.jpg', publicId: 'products/jelly-20mm', isPrimary: true, sortOrder: 0 }],
    },
    {
      supplierId: supplierProfileId,
      categoryId: catMap['Sand & Aggregates'],
      name: 'Jelly 40mm — Crushed Granite',
      description: 'Coarse aggregate 40mm crushed granite for mass concrete, dam work, and road base. Consistent gradation, low flakiness index.',
      shortDescription: '40mm granite aggregate for mass concrete and road base',
      unit: 'TON',
      basePrice: 1300,
      gstRate: 5,
      isGstInclusive: false,
      stockQuantity: 600,
      minOrderQuantity: 2,
      deliveryDays: 1,
      tags: ['aggregate', 'jelly', '40mm', 'granite', 'road'],
      status: 'ACTIVE',
      images: [{ url: 'https://res.cloudinary.com/buildx/image/upload/v1/products/jelly-40mm.jpg', publicId: 'products/jelly-40mm', isPrimary: true, sortOrder: 0 }],
    },

    // ── STEEL ──
    {
      supplierId: supplierProfileId,
      categoryId: catMap['Steel & TMT Bars'],
      name: 'Tata Tiscon TMT Bar 12mm Fe500D',
      description: 'Tata Tiscon Fe500D TMT bars 12mm — superior ductility, earthquake-resistant, corrosion-resistant ribbed surface. IS 1786:2008 certified. Ideal for columns and beams.',
      shortDescription: 'Earthquake-resistant Tata Tiscon TMT 12mm Fe500D',
      unit: 'KG',
      basePrice: 72,
      gstRate: 18,
      isGstInclusive: false,
      stockQuantity: 10000,
      minOrderQuantity: 100,
      deliveryDays: 2,
      tags: ['tmt', 'steel', 'tata-tiscon', '12mm', 'fe500d', 'rcc'],
      status: 'ACTIVE',
      isFeatured: true,
      images: [{ url: 'https://res.cloudinary.com/buildx/image/upload/v1/products/tmt-12mm.jpg', publicId: 'products/tmt-12mm', isPrimary: true, sortOrder: 0 }],
    },
    {
      supplierId: supplierProfileId,
      categoryId: catMap['Steel & TMT Bars'],
      name: 'JSW Neosteel TMT Bar 8mm Fe500D',
      description: 'JSW Neosteel 8mm Fe500D TMT bars for slab reinforcement, stirrups, and lighter structural members. Consistent diameter, high yield strength, BIS certified.',
      shortDescription: 'JSW Neosteel 8mm TMT for slab and slab reinforcement',
      unit: 'KG',
      basePrice: 74,
      gstRate: 18,
      isGstInclusive: false,
      stockQuantity: 8000,
      minOrderQuantity: 100,
      deliveryDays: 2,
      tags: ['tmt', 'steel', 'jsw', '8mm', 'fe500d', 'slab'],
      status: 'ACTIVE',
      images: [{ url: 'https://res.cloudinary.com/buildx/image/upload/v1/products/tmt-8mm.jpg', publicId: 'products/tmt-8mm', isPrimary: true, sortOrder: 0 }],
    },
    {
      supplierId: supplierProfileId,
      categoryId: catMap['Steel & TMT Bars'],
      name: 'Binding Wire — 18 Gauge GI',
      description: 'Galvanised iron binding wire 18 gauge for tying TMT bars in reinforcement work. 25 kg coil, smooth finish, easy to bend and tie.',
      shortDescription: '18 gauge GI binding wire, 25 kg coil',
      unit: 'KG',
      basePrice: 85,
      gstRate: 18,
      isGstInclusive: false,
      stockQuantity: 2000,
      minOrderQuantity: 25,
      deliveryDays: 1,
      tags: ['binding-wire', 'gi', '18-gauge', 'rebar'],
      status: 'ACTIVE',
      images: [{ url: 'https://res.cloudinary.com/buildx/image/upload/v1/products/binding-wire.jpg', publicId: 'products/binding-wire', isPrimary: true, sortOrder: 0 }],
    },

    // ── PLUMBING ──
    {
      supplierId: supplierProfileId,
      categoryId: catMap['Plumbing'],
      name: 'Ashirvad CPVC Pipe 1 inch — 3m',
      description: 'Ashirvad CPVC pipes for hot and cold water supply lines. Temperature-resistant up to 93°C, chlorine-resistant, BIS marked. 3-metre length, pressure rating 10 kg/cm².',
      shortDescription: 'CPVC hot/cold water pipe, temp-resistant up to 93°C',
      unit: 'PIECE',
      basePrice: 280,
      gstRate: 18,
      isGstInclusive: false,
      stockQuantity: 500,
      minOrderQuantity: 10,
      deliveryDays: 2,
      tags: ['cpvc', 'pipe', 'ashirvad', 'plumbing', 'hot-water'],
      status: 'ACTIVE',
      images: [{ url: 'https://res.cloudinary.com/buildx/image/upload/v1/products/cpvc-pipe.jpg', publicId: 'products/cpvc-pipe', isPrimary: true, sortOrder: 0 }],
    },
    {
      supplierId: supplierProfileId,
      categoryId: catMap['Plumbing'],
      name: 'PVC Drainage Pipe 4 inch — 3m (SWR)',
      description: 'Supreme Industries SWR (Soil Waste Rain) PVC drainage pipe 4 inch. Smooth inner surface, leak-proof ring-seal joints. For drainage, sewerage, and rainwater discharge.',
      shortDescription: 'SWR PVC 4 inch drainage pipe for sewerage',
      unit: 'PIECE',
      basePrice: 420,
      gstRate: 18,
      isGstInclusive: false,
      stockQuantity: 300,
      minOrderQuantity: 5,
      deliveryDays: 2,
      tags: ['pvc', 'swr', 'drainage', 'pipe', 'supreme'],
      status: 'ACTIVE',
      images: [{ url: 'https://res.cloudinary.com/buildx/image/upload/v1/products/swr-pipe.jpg', publicId: 'products/swr-pipe', isPrimary: true, sortOrder: 0 }],
    },

    // ── ELECTRICALS ──
    {
      supplierId: supplierProfileId,
      categoryId: catMap['Electricals'],
      name: 'Havells Wiring Cable 2.5 sqmm — 90m',
      description: 'Havells HRFR PVC insulated single-core copper wiring cable 2.5 sqmm. Fire retardant, heat resistant, suitable for concealed wiring in residential and commercial buildings.',
      shortDescription: 'Havells HRFR copper wire 2.5 sqmm, fire retardant',
      unit: 'PIECE',
      basePrice: 2200,
      gstRate: 18,
      isGstInclusive: false,
      stockQuantity: 200,
      minOrderQuantity: 1,
      deliveryDays: 2,
      tags: ['wire', 'cable', 'havells', '2.5sqmm', 'hrfr', 'copper'],
      status: 'ACTIVE',
      images: [{ url: 'https://res.cloudinary.com/buildx/image/upload/v1/products/wire-havells.jpg', publicId: 'products/wire-havells', isPrimary: true, sortOrder: 0 }],
    },
    {
      supplierId: supplierProfileId,
      categoryId: catMap['Electricals'],
      name: 'Legrand MCB 32A — Single Pole',
      description: 'Legrand DX3 single-pole MCB 32A, C-curve, 6kA breaking capacity. For circuit protection in residential and light commercial applications. IS 60898-1 certified.',
      shortDescription: 'Legrand 32A MCB single-pole, 6kA breaking capacity',
      unit: 'PIECE',
      basePrice: 320,
      gstRate: 18,
      isGstInclusive: false,
      stockQuantity: 500,
      minOrderQuantity: 5,
      deliveryDays: 1,
      tags: ['mcb', 'legrand', '32a', 'circuit-breaker'],
      status: 'ACTIVE',
      images: [{ url: 'https://res.cloudinary.com/buildx/image/upload/v1/products/mcb-legrand.jpg', publicId: 'products/mcb-legrand', isPrimary: true, sortOrder: 0 }],
    },

    // ── PAINTS ──
    {
      supplierId: supplierProfileId,
      categoryId: catMap['Paints & Chemicals'],
      name: 'Asian Paints Apex Exterior Emulsion — 20L',
      description: 'Asian Paints Apex Exterior Emulsion with advanced weatherproofing technology. UV-resistant, anti-algae, anti-fungal. 8-year warranty. Covers 120–140 sqft/litre.',
      shortDescription: 'Weatherproof exterior emulsion with 8-year warranty',
      unit: 'PIECE',
      basePrice: 3800,
      gstRate: 18,
      isGstInclusive: false,
      stockQuantity: 150,
      minOrderQuantity: 1,
      deliveryDays: 2,
      tags: ['paint', 'asian-paints', 'apex', 'exterior', 'weatherproof'],
      status: 'ACTIVE',
      isFeatured: true,
      images: [{ url: 'https://res.cloudinary.com/buildx/image/upload/v1/products/paint-apex.jpg', publicId: 'products/paint-apex', isPrimary: true, sortOrder: 0 }],
    },
    {
      supplierId: supplierProfileId,
      categoryId: catMap['Paints & Chemicals'],
      name: 'Dr. Fixit LW+ Waterproofing — 1L',
      description: 'Dr. Fixit LW+ integral waterproofing compound for cement concrete and mortar. Reduces water permeability by 90%. Used in roofs, bathrooms, basements, and water tanks.',
      shortDescription: 'Integral waterproofing compound, reduces permeability 90%',
      unit: 'PIECE',
      basePrice: 320,
      gstRate: 18,
      isGstInclusive: false,
      stockQuantity: 400,
      minOrderQuantity: 1,
      deliveryDays: 1,
      tags: ['waterproofing', 'dr-fixit', 'lw+', 'roof', 'bathroom'],
      status: 'ACTIVE',
      images: [{ url: 'https://res.cloudinary.com/buildx/image/upload/v1/products/waterproof-drfixit.jpg', publicId: 'products/waterproof-drfixit', isPrimary: true, sortOrder: 0 }],
    },

    // ── PLYWOOD ──
    {
      supplierId: supplierProfileId,
      categoryId: catMap['Plywood & Timber'],
      name: 'Greenply Commercial Plywood 18mm — 8×4 ft',
      description: 'Greenply commercial MR grade plywood 18mm. Moisture resistant, smooth surface, warp-free. IS 303 certified. For shuttering, furniture, and interior woodwork.',
      shortDescription: 'Greenply 18mm MR grade commercial plywood for shuttering',
      unit: 'PIECE',
      basePrice: 1450,
      gstRate: 12,
      isGstInclusive: false,
      stockQuantity: 300,
      minOrderQuantity: 5,
      deliveryDays: 3,
      tags: ['plywood', 'greenply', '18mm', 'mr-grade', 'shuttering'],
      status: 'ACTIVE',
      images: [{ url: 'https://res.cloudinary.com/buildx/image/upload/v1/products/plywood-greenply.jpg', publicId: 'products/plywood-greenply', isPrimary: true, sortOrder: 0 }],
    },

    // ── MACHINES ──
    {
      supplierId: supplierProfileId,
      categoryId: catMap['Machines & Tools'],
      name: 'Concrete Mixer 1 Bag — 200L Electric',
      description: '200-litre electric concrete mixer for on-site concrete mixing. 1-HP motor, 220V single-phase, 25–30 bags/hour output. Tilting drum, heavy-duty steel body, rubber tyres for mobility.',
      shortDescription: '200L electric mixer, 1HP, 25–30 bags/hour output',
      unit: 'PIECE',
      basePrice: 18500,
      gstRate: 18,
      isGstInclusive: false,
      stockQuantity: 20,
      minOrderQuantity: 1,
      deliveryDays: 3,
      tags: ['concrete-mixer', 'electric', '200l', 'construction-equipment'],
      status: 'ACTIVE',
      images: [{ url: 'https://res.cloudinary.com/buildx/image/upload/v1/products/mixer-200l.jpg', publicId: 'products/mixer-200l', isPrimary: true, sortOrder: 0 }],
    },

    // ── TILES ──
    {
      supplierId: supplierProfileId,
      categoryId: catMap['Tiles & Flooring'],
      name: 'Kajaria Floor Tiles 600×600mm — Matt',
      description: 'Kajaria vitrified floor tiles 600×600mm matt finish. Anti-skid, stain-resistant, PEI rating 4. For residential and commercial flooring. Sold per box (4 tiles).',
      shortDescription: 'Kajaria 600×600 vitrified floor tiles, anti-skid matt',
      unit: 'PIECE',
      basePrice: 85,
      gstRate: 18,
      isGstInclusive: false,
      stockQuantity: 5000,
      minOrderQuantity: 100,
      deliveryDays: 3,
      tags: ['tiles', 'kajaria', '600x600', 'vitrified', 'floor', 'matt'],
      status: 'ACTIVE',
      isFeatured: true,
      images: [{ url: 'https://res.cloudinary.com/buildx/image/upload/v1/products/tile-kajaria.jpg', publicId: 'products/tile-kajaria', isPrimary: true, sortOrder: 0 }],
    },
    {
      supplierId: supplierProfileId,
      categoryId: catMap['Tiles & Flooring'],
      name: 'Somany Wall Tiles 300×600mm — Glossy',
      description: 'Somany ceramic wall tiles 300×600mm glossy finish. Water-resistant, easy to clean. For kitchen backsplash, bathrooms, and wet areas. Sold per box (8 tiles).',
      shortDescription: 'Somany glossy wall tiles for bathroom and kitchen',
      unit: 'PIECE',
      basePrice: 45,
      gstRate: 18,
      isGstInclusive: false,
      stockQuantity: 8000,
      minOrderQuantity: 100,
      deliveryDays: 3,
      tags: ['tiles', 'somany', '300x600', 'wall-tiles', 'bathroom', 'kitchen'],
      status: 'ACTIVE',
      images: [{ url: 'https://res.cloudinary.com/buildx/image/upload/v1/products/tile-somany-wall.jpg', publicId: 'products/tile-somany-wall', isPrimary: true, sortOrder: 0 }],
    },
  ];
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(env.MONGODB_URI, { dbName: 'buildx' });
  console.log('Connected.\n');

  // ── 1. Categories ──────────────────────────────────────────────────────
  console.log('Seeding categories...');
  const existingCats = await Category.countDocuments();
  let catMap: Record<string, mongoose.Types.ObjectId> = {};

  if (existingCats > 0) {
    console.log(`  ${existingCats} categories already exist, skipping insert.`);
    const cats = await Category.find({});
    cats.forEach((c) => { catMap[c.name] = c._id as mongoose.Types.ObjectId; });
  } else {
    const inserted = await Category.insertMany(
      CATEGORIES.map((c) => ({ ...c, slug: slug(c.name) }))
    );
    inserted.forEach((c) => { catMap[c.name] = c._id as mongoose.Types.ObjectId; });
    console.log(`  Inserted ${inserted.length} categories.`);
  }

  // ── 2. Supplier users + profiles ──────────────────────────────────────
  console.log('\nSeeding supplier users and profiles...');
  const supplierIds: mongoose.Types.ObjectId[] = [];

  for (let i = 0; i < SUPPLIER_USERS.length; i++) {
    const userData = SUPPLIER_USERS[i];
    const profileData = SUPPLIER_PROFILES[i];

    let user = await User.findOne({ phone: userData.phone });
    if (!user) {
      user = await User.create(userData);
      console.log(`  Created user: ${userData.name}`);
    } else {
      console.log(`  User exists: ${userData.name}`);
    }

    let profile = await SupplierProfile.findOne({ userId: user._id });
    if (!profile) {
      profile = await SupplierProfile.create({ ...profileData, userId: user._id });
      console.log(`  Created profile: ${profileData.businessName}`);
    } else {
      console.log(`  Profile exists: ${profileData.businessName}`);
    }

    supplierIds.push(profile._id as mongoose.Types.ObjectId);
  }

  // ── 3. Products ────────────────────────────────────────────────────────
  console.log('\nSeeding products...');
  const existingProds = await Product.countDocuments();

  if (existingProds > 0) {
    console.log(`  ${existingProds} products already exist, skipping insert.`);
  } else {
    let totalInserted = 0;
    // Split products between 2 suppliers
    for (let s = 0; s < supplierIds.length; s++) {
      const prods = makeProducts(supplierIds[s], catMap);
      const half = Math.ceil(prods.length / 2);
      const batch = s === 0 ? prods.slice(0, half) : prods.slice(half);

      for (const prod of batch) {
        const productSlug = await uniqueSlug(slug(prod.name));
        await Product.create({ ...prod, slug: productSlug });
        totalInserted++;
      }
    }
    console.log(`  Inserted ${totalInserted} products.`);
  }

  // ── Summary ────────────────────────────────────────────────────────────
  console.log('\n── Seed complete ──────────────────────────────────────────');
  console.log(`Categories:  ${await Category.countDocuments()}`);
  console.log(`Suppliers:   ${await SupplierProfile.countDocuments()}`);
  console.log(`Products:    ${await Product.countDocuments()}`);
  console.log('────────────────────────────────────────────────────────────\n');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
