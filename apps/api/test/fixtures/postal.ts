// Synthetic test rows in the shape of the India Post directory. NOT real reference data —
// office names and coordinates are illustrative, chosen to span several states.

// Header style of recent data.gov.in releases (lower-case, with coordinates)
export const HEADER_RECENT = 'circlename,regionname,divisionname,officename,pincode,officetype,delivery,district,statename,latitude,longitude';

export const ROWS_RECENT = [
  'Karnataka Circle,South Karnataka Region,Tumakuru Division,Kuvempunagar S.O,572103,S.O,Delivery,TUMAKURU,KARNATAKA,13.3392,77.1140',
  'Karnataka Circle,South Karnataka Region,Tumakuru Division,R G Market S.O,572103,S.O,Non-Delivery,TUMAKURU,KARNATAKA,13.3410,77.1010',
  'Karnataka Circle,Bangalore HQ Region,Bangalore GPO Division,Bangalore G.P.O.,560001,H.O,Delivery,BENGALURU URBAN,KARNATAKA,12.9840,77.5890',
  'Delhi Circle,Delhi Region,New Delhi Central Division,Parliament House S.O,110001,S.O,Non-Delivery,NEW DELHI,DELHI,NA,NA',
  'Delhi Circle,Delhi Region,New Delhi Central Division,"Connaught Place, Main S.O",110001,S.O,Delivery,NEW DELHI,DELHI,28.6315,77.2167',
  'Maharashtra Circle,Mumbai Region,Mumbai GPO Division,Town Hall S.O,400001,S.O,Non-Delivery,MUMBAI,MAHARASHTRA,,',
];

// Older/mirror header style: different names and order, no coordinates
export const HEADER_LEGACY = 'officename,pincode,officeType,Deliverystatus,divisionname,regionname,circlename,Taluk,Districtname,statename,Telephone,relatedSuboffice,relatedHeadoffice';

export const ROWS_LEGACY = [
  'Kuvempunagar S.O,572103,S.O,Delivery,Tumakuru,South Karnataka,Karnataka,Tumakuru,Tumakuru,Karnataka,NA,NA,Tumakuru H.O',
  'Siliguri H.O,734001,H.O,Delivery,Siliguri,North Bengal,West Bengal,Siliguri,Darjiling,West Bengal,NA,NA,NA',
];

export const csv = (header: string, rows: string[], eol = '\n') => [header, ...rows].join(eol) + eol;

/** Feed text to the importer in small chunks so record/quote boundaries split across chunks */
export async function* chunked(text: string, size = 17) {
  for (let i = 0; i < text.length; i += size) yield text.slice(i, i + size);
}
