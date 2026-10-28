// Picks a BuildX material illustration (public/illustrations/*.svg) for a product that has no
// supplier photo. Matched on the product name first, then its category; always shown with an
// "Illustration" label so it is never mistaken for a photo of the actual item.
const RULES: [RegExp, string][] = [
  [/\bblocks?\b|aac|fly ?ash/i, 'blocks'],
  [/brick/i, 'bricks'],
  [/cement|concrete|opc|ppc|mortar/i, 'cement'],
  [/sand|aggregate|jelly|gravel|stone dust|m-sand/i, 'sand'],
  [/steel|tmt|\bbars?\b|rod|rebar|iron|binding wire/i, 'steel'],
  [/pipe|plumb|tap|valve|cpvc|upvc|pvc|fitting|tank/i, 'plumbing'],
  [/wire|cable|switch|electric|mcb|socket|conduit/i, 'electrical'],
  [/paint|primer|putty|emulsion|enamel|chemical|waterproof/i, 'paint'],
  [/ply|timber|wood|board|laminate|veneer|door/i, 'plywood'],
  [/tile|granite|marble|floor|vitrified/i, 'tiles'],
  [/tool|machine|drill|hammer|mixer|grinder|hardware|equipment/i, 'tools'],
];

export function illustrationFor(...hints: (string | undefined | null)[]): string {
  for (const hint of hints) {
    if (!hint) continue;
    for (const [re, name] of RULES) if (re.test(hint)) return `/illustrations/${name}.svg`;
  }
  return '/illustrations/generic.svg';
}
