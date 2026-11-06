import { catalogItem } from './data';
import type { CatalogItem } from './types';

// Shop by room: the same catalogue, grouped the way a home owner thinks ("what goes into my
// kitchen?") instead of by trade category. Every id must exist in the catalogue (checked by tests).

export type RoomSection = { title: string; itemIds: string[] };
export type Room = {
  slug: string;
  name: string;
  photo: string; // public/rooms
  tagline: string;
  sections: RoomSection[];
};

export const ROOMS: Room[] = [
  {
    slug: 'kitchen', name: 'Kitchen', photo: '/rooms/kitchen.jpg',
    tagline: 'Cabinets, counter, sink, chimney and the fittings that make it work every day.',
    sections: [
      { title: 'Cabinets and woodwork', itemIds: ['modular-kitchen', 'crockery-shoe-units'] },
      { title: 'Counter and walls', itemIds: ['granite', 'ceramic-wall-tiles', 'vitrified-tiles'] },
      { title: 'Sink, chimney and taps', itemIds: ['kitchen-sinks', 'kitchen-chimneys', 'bath-fittings'] },
      { title: 'Fittings inside the cabinets', itemIds: ['cabinet-hinges', 'drawer-channels', 'kitchen-baskets', 'handles-knobs', 'wardrobe-fittings'] },
      { title: 'Behind the walls', itemIds: ['cpvc-pipes', 'house-wires', 'modular-switches'] },
    ],
  },
  {
    slug: 'bathroom', name: 'Bathroom', photo: '/rooms/bathroom.jpg',
    tagline: 'Tiles, sanitaryware, taps, shower partitions and a vanity, all waterproofed right.',
    sections: [
      { title: 'Floor and walls', itemIds: ['ceramic-wall-tiles', 'floor-outdoor-tiles', 'vitrified-tiles', 'tile-adhesive-grout'] },
      { title: 'Sanitaryware and taps', itemIds: ['sanitaryware', 'bath-fittings', 'bath-accessories'] },
      { title: 'Shower, vanity and mirror', itemIds: ['shower-partitions', 'vanities-mirrors', 'water-heaters'] },
      { title: 'Door and ceiling', itemIds: ['bathroom-doors', 'pvc-wpc-panels'] },
      { title: 'Before the tiles go in', itemIds: ['waterproofing', 'cpvc-pipes', 'swr-pipes'] },
    ],
  },
  {
    slug: 'bedroom', name: 'Bedroom', photo: '/rooms/bedroom.jpg',
    tagline: 'Wardrobes, a storage bed, a soft ceiling and floors that feel warm underfoot.',
    sections: [
      { title: 'Wardrobes and furniture', itemIds: ['wardrobes', 'storage-beds', 'study-units'] },
      { title: 'Fittings', itemIds: ['wardrobe-fittings', 'cabinet-hinges', 'handles-knobs', 'door-locks'] },
      { title: 'Ceiling and walls', itemIds: ['gypsum-false-ceiling', 'pvc-wpc-panels', 'wallpaper', 'interior-emulsion'] },
      { title: 'Floor', itemIds: ['vitrified-tiles', 'laminate-flooring', 'vinyl-spc-flooring'] },
      { title: 'Light, fan and windows', itemIds: ['led-lighting', 'ceiling-fans', 'upvc-windows', 'mosquito-mesh'] },
    ],
  },
  {
    slug: 'living-dining', name: 'Living and dining', photo: '/rooms/living.jpg',
    tagline: 'The room guests see: TV wall, false ceiling with cove light, floors and partitions.',
    sections: [
      { title: 'TV wall and storage', itemIds: ['tv-units', 'crockery-shoe-units', 'jaali-partitions'] },
      { title: 'Ceiling and lights', itemIds: ['gypsum-false-ceiling', 'led-lighting', 'ceiling-fans'] },
      { title: 'Walls', itemIds: ['texture-finishes', 'pvc-wpc-panels', 'wall-cladding', 'interior-emulsion'] },
      { title: 'Floor', itemIds: ['vitrified-tiles', 'marble-kota-shahabad', 'granite'] },
      { title: 'Doors and windows', itemIds: ['main-doors', 'upvc-windows', 'aluminium-windows', 'glass'] },
    ],
  },
  {
    slug: 'pooja', name: 'Pooja room', photo: '/rooms/pooja.jpg',
    tagline: 'A mandir in wood or stone, jaali panels, a carved door and warm lighting.',
    sections: [
      { title: 'Mandir and panels', itemIds: ['pooja-units', 'jaali-partitions', 'main-doors'] },
      { title: 'Floor and walls', itemIds: ['marble-kota-shahabad', 'granite', 'wall-cladding'] },
      { title: 'Light and finish', itemIds: ['led-lighting', 'texture-finishes'] },
    ],
  },
  {
    slug: 'exterior-terrace', name: 'Exterior and terrace', photo: '/rooms/exterior.jpg',
    tagline: 'Front elevation, roof, terrace waterproofing, gate, driveway and rainwater.',
    sections: [
      { title: 'Front elevation', itemIds: ['exterior-emulsion', 'wall-cladding', 'texture-finishes'] },
      { title: 'Roof and terrace', itemIds: ['terrace-waterproofing', 'roofing-sheets', 'clay-roof-tiles', 'polycarbonate-sheets'] },
      { title: 'Doors, windows and grills', itemIds: ['steel-safety-doors', 'aluminium-windows', 'mosquito-mesh'] },
      { title: 'Driveway and compound', itemIds: ['paver-blocks', 'floor-outdoor-tiles', 'solid-concrete-blocks'] },
      { title: 'Water', itemIds: ['rainwater-gutters', 'water-tanks', 'water-pumps'] },
    ],
  },
];

export function room(slug: string): Room | undefined {
  return ROOMS.find((r) => r.slug === slug);
}

/** A room's sections with the catalogue items resolved (unknown ids are skipped). */
export function roomSections(r: Room): { title: string; items: CatalogItem[] }[] {
  return r.sections.map((s) => ({
    title: s.title,
    items: s.itemIds.map((id) => catalogItem(id)).filter((i): i is CatalogItem => Boolean(i)),
  }));
}

/** Rooms that use a catalogue item, for "Used in" links on material pages. */
export function roomsFor(itemId: string): Room[] {
  return ROOMS.filter((r) => r.sections.some((s) => s.itemIds.includes(itemId)));
}
