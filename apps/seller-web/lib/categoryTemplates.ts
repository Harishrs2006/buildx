// Per-category product form hints: a default unit plus 1-2 quick-pick spec fields, keyed by the
// real category slugs (from GET /categories). Each spec becomes one entry in the product's
// `specifications` map — e.g. choosing "12" under Steel & TMT Bars' Size (mm) field just sets
// specifications["Size (mm)"] = "12". A seller still lists one product per size/variant (TMT
// 8mm, TMT 12mm, ... are separate listings); this only speeds up filling in each one.

export type SpecField = {
  key: string;
  label: string;
  options: string[];
  allowCustom?: boolean;
};

export type CategoryTemplate = {
  unitHint: string;
  specFields: SpecField[];
};

export const CATEGORY_TEMPLATES: Record<string, CategoryTemplate> = {
  'cement-concrete': {
    unitHint: 'BAG',
    specFields: [
      { key: 'Grade', label: 'Grade', options: ['OPC 43', 'OPC 53', 'PPC'], allowCustom: true },
      { key: 'Bag Weight (kg)', label: 'Bag weight (kg)', options: ['25', '50'], allowCustom: true },
    ],
  },
  'bricks-blocks': {
    unitHint: 'PIECE',
    specFields: [
      { key: 'Type', label: 'Type', options: ['Red Brick', 'Fly Ash Brick', 'AAC Block', 'CC Block'], allowCustom: true },
      { key: 'Size', label: 'Size', options: ['4x8x16 in', '6x8x16 in', '8x8x16 in'], allowCustom: true },
    ],
  },
  'sand-aggregates': {
    unitHint: 'TON',
    specFields: [
      { key: 'Type', label: 'Type', options: ['M-Sand', 'P-Sand', 'River Sand', 'Jelly / Aggregate'], allowCustom: true },
      { key: 'Size (mm)', label: 'Size (mm)', options: ['10', '12', '20', '40'], allowCustom: true },
    ],
  },
  'steel-tmt-bars': {
    unitHint: 'KG',
    specFields: [
      { key: 'Size (mm)', label: 'Size (mm)', options: ['8', '10', '12', '16', '20', '25', '32'], allowCustom: true },
      { key: 'Grade', label: 'Grade', options: ['Fe 500', 'Fe 500D', 'Fe 550'], allowCustom: true },
    ],
  },
  plumbing: {
    unitHint: 'PIECE',
    specFields: [
      { key: 'Pipe Type', label: 'Pipe type', options: ['PVC', 'CPVC', 'UPVC', 'SWR'], allowCustom: true },
      { key: 'Diameter (inch)', label: 'Diameter (inch)', options: ['0.5', '0.75', '1', '1.5', '2', '3', '4'], allowCustom: true },
    ],
  },
  electricals: {
    unitHint: 'METER',
    specFields: [
      { key: 'Wire Gauge (sq mm)', label: 'Wire gauge (sq mm)', options: ['1', '1.5', '2.5', '4', '6', '10'], allowCustom: true },
      { key: 'Core', label: 'Core', options: ['Single Core', 'Multi Core'] },
    ],
  },
  'paints-chemicals': {
    unitHint: 'LITER',
    specFields: [
      { key: 'Finish', label: 'Finish', options: ['Interior', 'Exterior', 'Waterproofing', 'Primer', 'Putty'], allowCustom: true },
      { key: 'Volume (L)', label: 'Volume (L)', options: ['1', '4', '10', '20'], allowCustom: true },
    ],
  },
  'plywood-timber': {
    unitHint: 'PIECE',
    specFields: [
      { key: 'Thickness (mm)', label: 'Thickness (mm)', options: ['6', '9', '12', '16', '19', '25'], allowCustom: true },
      { key: 'Grade', label: 'Grade', options: ['BWP', 'MR', 'Commercial'], allowCustom: true },
    ],
  },
  'machines-tools': {
    unitHint: 'PIECE',
    specFields: [
      { key: 'Power Source', label: 'Power source', options: ['Manual', 'Electric', 'Diesel'] },
    ],
  },
  'tiles-flooring': {
    unitHint: 'SQUARE_METER',
    specFields: [
      { key: 'Size (inch)', label: 'Size (inch)', options: ['12x12', '16x16', '24x24', '32x32'], allowCustom: true },
      { key: 'Finish', label: 'Finish', options: ['Glossy', 'Matte'] },
    ],
  },
};

export const DEFAULT_TEMPLATE: CategoryTemplate = {
  unitHint: 'PIECE',
  specFields: [],
};

export function templateForCategory(slug: string | undefined): CategoryTemplate {
  return (slug && CATEGORY_TEMPLATES[slug]) || DEFAULT_TEMPLATE;
}
