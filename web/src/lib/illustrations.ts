/**
 * Every illustration the UI uses, in one place. To swap in painted artwork, drop the new file into
 * public/illustrations/ and change its path here (any format next/image accepts). See MANIFEST.md.
 */
export const ART = {
  panorama: { src: "/illustrations/campus-panorama.svg", width: 1600, height: 420 },
  map: { src: "/illustrations/map-landscape.svg", width: 1200, height: 760 },
  flowers: { src: "/illustrations/flowers.svg", width: 120, height: 140 },
  books: { src: "/illustrations/books.svg", width: 160, height: 110 },
  signpost: { src: "/illustrations/signpost.svg", width: 220, height: 260 },
  desk: { src: "/illustrations/desk-scene.svg", width: 1200, height: 420 },
} as const;

export const CAMPUS_ART = {
  brick: { src: "/illustrations/campus-brick.svg", width: 480, height: 240 },
  sandstone: { src: "/illustrations/campus-sandstone.svg", width: 480, height: 240 },
  gothic: { src: "/illustrations/campus-gothic.svg", width: 480, height: 240 },
  dome: { src: "/illustrations/campus-dome.svg", width: 480, height: 240 },
} as const;

/** Hand-picked styles for well-known campuses; everything else gets a stable style from its slug. */
const CAMPUS_STYLE: Record<string, keyof typeof CAMPUS_ART> = {
  harvard: "brick",
  "harvard-university": "brick",
  yale: "gothic",
  "yale-university": "gothic",
  princeton: "gothic",
  "princeton-university": "gothic",
  "duke-university": "gothic",
  duke: "gothic",
  stanford: "sandstone",
  "stanford-university": "sandstone",
  "university-of-southern-california": "brick",
  "massachusetts-institute-of-technology": "dome",
  "columbia-university-in-the-city-of-new-york": "dome",
  "university-of-virginia-main-campus": "dome",
  "university-of-chicago": "gothic",
  "brown-university": "brick",
  "dartmouth-college": "brick",
  "cornell-university": "gothic",
  "university-of-pennsylvania": "brick",
  "california-institute-of-technology": "sandstone",
  "rice-university": "sandstone",
};

export function campusArtFor(slug: string) {
  const style = CAMPUS_STYLE[slug];
  if (style) return CAMPUS_ART[style];
  const keys = Object.keys(CAMPUS_ART) as Array<keyof typeof CAMPUS_ART>;
  let hash = 0;
  for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return CAMPUS_ART[keys[hash % keys.length]!];
}
