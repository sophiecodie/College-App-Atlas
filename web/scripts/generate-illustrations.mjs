/**
 * Generates CollegeAtlas's storybook illustration set as SVG files in public/illustrations/.
 * Everything shares one palette and one set of drawing helpers so the scenes stay consistent.
 * Rerun after editing: `node scripts/generate-illustrations.mjs`. To use painted artwork instead,
 * replace a file (or point src/lib/illustrations.ts at a PNG/WebP); see public/illustrations/MANIFEST.md.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const OUT = path.join(process.cwd(), "public", "illustrations");
mkdirSync(OUT, { recursive: true });

const C = {
  skyTop: "#BFDCF2",
  skyMid: "#DCEBF6",
  skyLow: "#F8EEE6",
  cloud: "#FFFDF9",
  mountain: "#B9CADB",
  mountainShade: "#A3B7CB",
  snow: "#F4F7FA",
  hillFar: "#BFD8B2",
  hill: "#A7C9A2",
  hillNear: "#8FBB89",
  meadow: "#C9E0B4",
  meadowDark: "#B5D39F",
  pine: "#4F7E57",
  pineLight: "#6A9A68",
  leaf: "#7DAE6B",
  leafLight: "#9CC484",
  leafDark: "#5C8C55",
  autumn: "#E2A46A",
  blossom: "#F1C7CF",
  trunk: "#8A6A55",
  brick: "#C47A68",
  brickDark: "#A9604F",
  brickLight: "#D99A86",
  roof: "#7E5A5E",
  roofLight: "#94706F",
  slate: "#6F7F92",
  stone: "#E6D6BF",
  stoneDark: "#CDB894",
  sandstone: "#E7C995",
  sandstoneDark: "#CFA86E",
  tile: "#C8735E",
  tileDark: "#A85C4A",
  white: "#FFFDF9",
  window: "#F6E7B8",
  windowDark: "#7D6A63",
  water: "#9CC7E8",
  waterLight: "#C3DEF2",
  path: "#EAD8B6",
  rose: "#D58D9A",
  roseLight: "#F1D5D9",
  butter: "#F8D98C",
  sage: "#A7C9A2",
  blue: "#8EBBE5",
  charcoal: "#332D2B",
  brown: "#88756F",
  cream: "#F8F0E9",
  ivory: "#FFFBF7",
  catWhite: "#FFF8EF",
  catOrange: "#E6A066",
  catDark: "#5B4A45",
  pink: "#EDA9B5",
};

// Deterministic pseudo-random numbers so regenerated art is identical.
function rng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const f = (n) => Math.round(n * 10) / 10;

function svg(width, height, body, defs = "") {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice">
<defs>${defs}</defs>
${body}
</svg>
`;
}

function skyGradient(id, stops = [C.skyTop, C.skyMid, C.skyLow]) {
  return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops
    .map((color, index) => `<stop offset="${index / (stops.length - 1)}" stop-color="${color}"/>`)
    .join("")}</linearGradient>`;
}

function cloud(x, y, s = 1, opacity = 0.95) {
  return `<g opacity="${opacity}" fill="${C.cloud}">
<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(46 * s)}" ry="${f(15 * s)}"/>
<ellipse cx="${f(x - 22 * s)}" cy="${f(y - 8 * s)}" rx="${f(22 * s)}" ry="${f(15 * s)}"/>
<ellipse cx="${f(x + 8 * s)}" cy="${f(y - 15 * s)}" rx="${f(26 * s)}" ry="${f(19 * s)}"/>
<ellipse cx="${f(x + 32 * s)}" cy="${f(y - 5 * s)}" rx="${f(18 * s)}" ry="${f(12 * s)}"/>
</g>`;
}

function sun(x, y, r = 22) {
  const rays = Array.from({ length: 10 }, (_, index) => {
    const angle = (index / 10) * Math.PI * 2;
    return `<line x1="${f(x + Math.cos(angle) * (r + 6))}" y1="${f(y + Math.sin(angle) * (r + 6))}" x2="${f(
      x + Math.cos(angle) * (r + 16),
    )}" y2="${f(y + Math.sin(angle) * (r + 16))}"/>`;
  }).join("");
  return `<g><circle cx="${x}" cy="${y}" r="${r + 10}" fill="${C.butter}" opacity="0.25"/><circle cx="${x}" cy="${y}" r="${r}" fill="${C.butter}"/><g stroke="${C.butter}" stroke-width="4" stroke-linecap="round">${rays}</g></g>`;
}

function pine(x, y, s = 1, color = C.pine, light = C.pineLight) {
  const w = 26 * s;
  const h = 70 * s;
  return `<g>
<rect x="${f(x - 3 * s)}" y="${f(y - 10 * s)}" width="${f(6 * s)}" height="${f(12 * s)}" fill="${C.trunk}"/>
<polygon points="${f(x)},${f(y - h)} ${f(x - w * 0.6)},${f(y - h * 0.45)} ${f(x + w * 0.6)},${f(y - h * 0.45)}" fill="${light}"/>
<polygon points="${f(x)},${f(y - h * 0.78)} ${f(x - w * 0.8)},${f(y - h * 0.22)} ${f(x + w * 0.8)},${f(y - h * 0.22)}" fill="${color}"/>
<polygon points="${f(x)},${f(y - h * 0.55)} ${f(x - w)},${f(y - 6 * s)} ${f(x + w)},${f(y - 6 * s)}" fill="${color}"/>
<polygon points="${f(x)},${f(y - h * 0.55)} ${f(x + w)},${f(y - 6 * s)} ${f(x + w * 0.2)},${f(y - 6 * s)}" fill="#000" opacity="0.08"/>
</g>`;
}

function roundTree(x, y, s = 1, color = C.leaf, light = C.leafLight) {
  return `<g>
<rect x="${f(x - 3.5 * s)}" y="${f(y - 18 * s)}" width="${f(7 * s)}" height="${f(20 * s)}" fill="${C.trunk}"/>
<circle cx="${f(x - 12 * s)}" cy="${f(y - 30 * s)}" r="${f(15 * s)}" fill="${color}"/>
<circle cx="${f(x + 12 * s)}" cy="${f(y - 31 * s)}" r="${f(15 * s)}" fill="${color}"/>
<circle cx="${f(x)}" cy="${f(y - 44 * s)}" r="${f(18 * s)}" fill="${color}"/>
<circle cx="${f(x - 5 * s)}" cy="${f(y - 49 * s)}" r="${f(9 * s)}" fill="${light}" opacity="0.8"/>
<circle cx="${f(x + 9 * s)}" cy="${f(y - 34 * s)}" r="${f(6 * s)}" fill="${light}" opacity="0.6"/>
</g>`;
}

function bush(x, y, s = 1, color = C.leafDark) {
  return `<g fill="${color}"><circle cx="${f(x - 8 * s)}" cy="${f(y - 6 * s)}" r="${f(8 * s)}"/><circle cx="${f(x + 6 * s)}" cy="${f(y - 7 * s)}" r="${f(9 * s)}"/><circle cx="${f(x)}" cy="${f(y - 12 * s)}" r="${f(8 * s)}"/></g>`;
}

function flower(x, y, s = 1, petal = C.pink) {
  return `<g><line x1="${x}" y1="${y}" x2="${x}" y2="${f(y - 12 * s)}" stroke="${C.leafDark}" stroke-width="${f(1.6 * s)}"/>
${[0, 72, 144, 216, 288]
  .map((deg) => {
    const a = (deg * Math.PI) / 180;
    return `<circle cx="${f(x + Math.cos(a) * 3.5 * s)}" cy="${f(y - 14 * s + Math.sin(a) * 3.5 * s)}" r="${f(2.6 * s)}" fill="${petal}"/>`;
  })
  .join("")}<circle cx="${x}" cy="${f(y - 14 * s)}" r="${f(1.8 * s)}" fill="${C.butter}"/></g>`;
}

function forest(r, x0, x1, yBase, count, sMin, sMax, opts = {}) {
  const items = [];
  for (let index = 0; index < count; index += 1) {
    const x = x0 + r() * (x1 - x0);
    const y = yBase + (r() - 0.5) * (opts.jitter ?? 10);
    const s = sMin + r() * (sMax - sMin);
    const kind = r();
    if (kind < (opts.pineShare ?? 0.45)) items.push([y, pine(x, y, s, r() < 0.5 ? C.pine : C.leafDark)]);
    else items.push([y, roundTree(x, y, s, r() < (opts.autumnShare ?? 0.12) ? C.autumn : r() < 0.15 ? C.blossom : C.leaf)]);
  }
  return items
    .sort((a, b) => a[0] - b[0])
    .map((item) => item[1])
    .join("\n");
}

function windowsGrid(x, y, cols, rows, w, h, gapX, gapY, color = C.window, arch = false) {
  let out = "";
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const wx = x + col * (w + gapX);
      const wy = y + row * (h + gapY);
      out += arch
        ? `<path d="M${f(wx)} ${f(wy + h)} V${f(wy + w / 2)} A${f(w / 2)} ${f(w / 2)} 0 0 1 ${f(wx + w)} ${f(wy + w / 2)} V${f(wy + h)} Z" fill="${color}"/>`
        : `<rect x="${f(wx)}" y="${f(wy)}" width="${f(w)}" height="${f(h)}" rx="1" fill="${color}"/><rect x="${f(wx)}" y="${f(wy + h / 2 - 0.6)}" width="${f(w)}" height="1.2" fill="${C.white}" opacity="0.7"/>`;
    }
  }
  return out;
}

/** Red-brick hall with white cupola (Harvard-style). */
function brickHall(x, y, w, h) {
  const roofH = h * 0.22;
  const cx = x + w / 2;
  return `<g>
<rect x="${f(x)}" y="${f(y - h)}" width="${f(w)}" height="${f(h)}" fill="${C.brick}"/>
<rect x="${f(x)}" y="${f(y - h)}" width="${f(w)}" height="${f(h * 0.06)}" fill="${C.white}" opacity="0.85"/>
<polygon points="${f(x - 6)},${f(y - h)} ${f(x + w + 6)},${f(y - h)} ${f(x + w - 10)},${f(y - h - roofH)} ${f(x + 10)},${f(y - h - roofH)}" fill="${C.roof}"/>
<rect x="${f(x + w * 0.1)}" y="${f(y - h - roofH - 12)}" width="8" height="14" fill="${C.brickDark}"/>
<rect x="${f(x + w * 0.85)}" y="${f(y - h - roofH - 12)}" width="8" height="14" fill="${C.brickDark}"/>
${windowsGrid(x + w * 0.07, y - h * 0.82, Math.max(3, Math.round(w / 22)), 3, w * 0.045, h * 0.17, (w * 0.86 - Math.max(3, Math.round(w / 22)) * w * 0.045) / Math.max(2, Math.round(w / 22) - 1), h * 0.08)}
<rect x="${f(cx - w * 0.09)}" y="${f(y - h * 0.32)}" width="${f(w * 0.18)}" height="${f(h * 0.32)}" fill="${C.white}"/>
<path d="M${f(cx - w * 0.05)} ${f(y)} V${f(y - h * 0.2)} A${f(w * 0.05)} ${f(w * 0.05)} 0 0 1 ${f(cx + w * 0.05)} ${f(y - h * 0.2)} V${f(y)} Z" fill="${C.windowDark}"/>
<rect x="${f(cx - w * 0.07)}" y="${f(y - h - roofH - h * 0.28)}" width="${f(w * 0.14)}" height="${f(h * 0.3)}" fill="${C.white}"/>
${windowsGrid(cx - w * 0.04, y - h - roofH - h * 0.24, 2, 1, w * 0.025, h * 0.14, w * 0.03, 0, C.windowDark, true)}
<polygon points="${f(cx - w * 0.09)},${f(y - h - roofH - h * 0.28)} ${f(cx + w * 0.09)},${f(y - h - roofH - h * 0.28)} ${f(cx)},${f(y - h - roofH - h * 0.62)}" fill="${C.white}"/>
<polygon points="${f(cx)},${f(y - h - roofH - h * 0.62)} ${f(cx + w * 0.09)},${f(y - h - roofH - h * 0.28)} ${f(cx + w * 0.02)},${f(y - h - roofH - h * 0.28)}" fill="${C.stoneDark}" opacity="0.5"/>
<line x1="${f(cx)}" y1="${f(y - h - roofH - h * 0.62)}" x2="${f(cx)}" y2="${f(y - h - roofH - h * 0.74)}" stroke="${C.brown}" stroke-width="1.5"/>
</g>`;
}

/** Sandstone arcade with red tile roof and a tall tower (Stanford-style). */
function sandstoneQuad(x, y, w, h) {
  const arches = Math.max(4, Math.round(w / 24));
  const archW = (w * 0.9) / arches;
  let arcade = "";
  for (let index = 0; index < arches; index += 1) {
    const ax = x + w * 0.05 + index * archW + archW * 0.15;
    arcade += `<path d="M${f(ax)} ${f(y)} V${f(y - h * 0.32)} A${f(archW * 0.35)} ${f(archW * 0.35)} 0 0 1 ${f(ax + archW * 0.7)} ${f(y - h * 0.32)} V${f(y)} Z" fill="${C.windowDark}" opacity="0.8"/>`;
  }
  const tx = x + w * 0.72;
  const tw = w * 0.12;
  return `<g>
<rect x="${f(tx)}" y="${f(y - h * 2.3)}" width="${f(tw)}" height="${f(h * 2.3)}" fill="${C.sandstone}"/>
<rect x="${f(tx + tw * 0.6)}" y="${f(y - h * 2.3)}" width="${f(tw * 0.4)}" height="${f(h * 2.3)}" fill="${C.sandstoneDark}" opacity="0.45"/>
${windowsGrid(tx + tw * 0.25, y - h * 2.1, 2, 4, tw * 0.18, h * 0.16, tw * 0.14, h * 0.18, C.windowDark, true)}
<path d="M${f(tx - 3)} ${f(y - h * 2.3)} H${f(tx + tw + 3)} L${f(tx + tw * 0.75)} ${f(y - h * 2.55)} H${f(tx + tw * 0.25)} Z" fill="${C.tile}"/>
<path d="M${f(tx + tw * 0.2)} ${f(y - h * 2.55)} Q${f(tx + tw / 2)} ${f(y - h * 2.95)} ${f(tx + tw * 0.8)} ${f(y - h * 2.55)} Z" fill="${C.tileDark}"/>
<rect x="${f(x)}" y="${f(y - h)}" width="${f(w)}" height="${f(h)}" fill="${C.sandstone}"/>
<rect x="${f(x)}" y="${f(y - h * 0.62)}" width="${f(w)}" height="3" fill="${C.sandstoneDark}" opacity="0.6"/>
${windowsGrid(x + w * 0.08, y - h * 0.9, arches, 1, archW * 0.35, h * 0.18, archW * 0.65, 0, C.windowDark)}
${arcade}
<polygon points="${f(x - 8)},${f(y - h)} ${f(x + w + 8)},${f(y - h)} ${f(x + w - 4)},${f(y - h - h * 0.22)} ${f(x + 4)},${f(y - h - h * 0.22)}" fill="${C.tile}"/>
<polygon points="${f(x + w * 0.38)},${f(y - h - h * 0.2)} ${f(x + w * 0.62)},${f(y - h - h * 0.2)} ${f(x + w / 2)},${f(y - h - h * 0.62)}" fill="${C.sandstone}"/>
<polygon points="${f(x + w * 0.35)},${f(y - h - h * 0.2)} ${f(x + w / 2)},${f(y - h - h * 0.66)} ${f(x + w * 0.65)},${f(y - h - h * 0.2)} ${f(x + w * 0.6)},${f(y - h - h * 0.2)} ${f(x + w / 2)},${f(y - h - h * 0.58)} ${f(x + w * 0.4)},${f(y - h - h * 0.2)}" fill="${C.tile}"/>
<circle cx="${f(x + w / 2)}" cy="${f(y - h - h * 0.36)}" r="${f(h * 0.07)}" fill="${C.windowDark}" opacity="0.8"/>
</g>`;
}

/** Collegiate gothic hall with towers and spires. */
function gothicHall(x, y, w, h) {
  const tower = (tx, tw, th) => `<rect x="${f(tx)}" y="${f(y - th)}" width="${f(tw)}" height="${f(th)}" fill="${C.stone}"/>
<rect x="${f(tx + tw * 0.65)}" y="${f(y - th)}" width="${f(tw * 0.35)}" height="${f(th)}" fill="${C.stoneDark}" opacity="0.55"/>
${windowsGrid(tx + tw * 0.28, y - th * 0.9, 1, 3, tw * 0.44, th * 0.13, 0, th * 0.12, C.windowDark, true)}
${Array.from({ length: 4 }, (_, i) => `<rect x="${f(tx + (i * tw) / 3.6)}" y="${f(y - th - 7)}" width="${f(tw / 6)}" height="8" fill="${C.stone}"/>`).join("")}
<polygon points="${f(tx + tw * 0.15)},${f(y - th - 6)} ${f(tx + tw * 0.85)},${f(y - th - 6)} ${f(tx + tw / 2)},${f(y - th - tw * 1.3)}" fill="${C.slate}"/>`;
  return `<g>
<rect x="${f(x)}" y="${f(y - h)}" width="${f(w)}" height="${f(h)}" fill="${C.stone}"/>
<polygon points="${f(x - 4)},${f(y - h)} ${f(x + w + 4)},${f(y - h)} ${f(x + w / 2)},${f(y - h - h * 0.45)}" fill="${C.slate}"/>
${windowsGrid(x + w * 0.1, y - h * 0.8, Math.max(3, Math.round(w / 20)), 2, w * 0.06, h * 0.26, (w * 0.8 - Math.max(3, Math.round(w / 20)) * w * 0.06) / Math.max(2, Math.round(w / 20) - 1), h * 0.12, C.windowDark, true)}
<circle cx="${f(x + w / 2)}" cy="${f(y - h - h * 0.16)}" r="${f(h * 0.08)}" fill="${C.window}"/>
${tower(x - w * 0.16, w * 0.18, h * 1.7)}
${tower(x + w * 0.98, w * 0.18, h * 1.45)}
<path d="M${f(x + w * 0.44)} ${f(y)} V${f(y - h * 0.3)} A${f(w * 0.06)} ${f(w * 0.06)} 0 0 1 ${f(x + w * 0.56)} ${f(y - h * 0.3)} V${f(y)} Z" fill="${C.windowDark}"/>
</g>`;
}

/** Neoclassical stone building with columns and a dome. */
function domeHall(x, y, w, h) {
  const cols = 6;
  let columns = "";
  for (let index = 0; index < cols; index += 1) {
    columns += `<rect x="${f(x + w * 0.28 + index * ((w * 0.44) / (cols - 1)) - 3)}" y="${f(y - h * 0.62)}" width="6" height="${f(h * 0.62)}" fill="${C.white}"/>`;
  }
  return `<g>
<rect x="${f(x)}" y="${f(y - h * 0.75)}" width="${f(w)}" height="${f(h * 0.75)}" fill="${C.stone}"/>
${windowsGrid(x + w * 0.05, y - h * 0.6, 3, 2, w * 0.05, h * 0.16, w * 0.025, h * 0.1, C.windowDark)}
${windowsGrid(x + w * 0.77, y - h * 0.6, 3, 2, w * 0.05, h * 0.16, w * 0.025, h * 0.1, C.windowDark)}
<rect x="${f(x + w * 0.25)}" y="${f(y - h * 0.62)}" width="${f(w * 0.5)}" height="${f(h * 0.62)}" fill="${C.stoneDark}" opacity="0.5"/>
${columns}
<polygon points="${f(x + w * 0.22)},${f(y - h * 0.62)} ${f(x + w * 0.78)},${f(y - h * 0.62)} ${f(x + w / 2)},${f(y - h * 0.86)}" fill="${C.white}"/>
<rect x="${f(x + w * 0.36)}" y="${f(y - h * 1.08)}" width="${f(w * 0.28)}" height="${f(h * 0.22)}" fill="${C.stone}"/>
<path d="M${f(x + w * 0.34)} ${f(y - h * 1.08)} A${f(w * 0.16)} ${f(h * 0.3)} 0 0 1 ${f(x + w * 0.66)} ${f(y - h * 1.08)} Z" fill="${C.sage}"/>
<path d="M${f(x + w * 0.5)} ${f(y - h * 1.38)} A${f(w * 0.16)} ${f(h * 0.3)} 0 0 1 ${f(x + w * 0.66)} ${f(y - h * 1.08)} H${f(x + w * 0.56)} Z" fill="#000" opacity="0.08"/>
<line x1="${f(x + w / 2)}" y1="${f(y - h * 1.38)}" x2="${f(x + w / 2)}" y2="${f(y - h * 1.5)}" stroke="${C.brown}" stroke-width="2"/>
</g>`;
}

function campusScene({ width, height, building, seed, sky = true }) {
  const r = rng(seed);
  const ground = height * 0.8;
  const defs = skyGradient("sky");
  const body = `
${sky ? `<rect width="${width}" height="${height}" fill="url(#sky)"/>` : ""}
${cloud(width * 0.18, height * 0.2, width / 500)}
${cloud(width * 0.78, height * 0.14, width / 650, 0.85)}
<path d="M0 ${f(ground - height * 0.18)} Q${f(width * 0.25)} ${f(ground - height * 0.32)} ${f(width * 0.5)} ${f(ground - height * 0.2)} T${width} ${f(ground - height * 0.22)} V${height} H0 Z" fill="${C.hillFar}"/>
${forest(r, -10, width + 10, ground - height * 0.14, Math.round(width / 26), height / 380, height / 260, { jitter: height * 0.05 })}
${building(width, ground)}
<path d="M0 ${f(ground)} Q${f(width / 2)} ${f(ground - height * 0.04)} ${width} ${f(ground)} V${height} H0 Z" fill="${C.hill}"/>
<path d="M${f(width * 0.46)} ${height} Q${f(width * 0.5)} ${f(ground + height * 0.05)} ${f(width * 0.5)} ${f(ground)} Q${f(width * 0.5)} ${f(ground + height * 0.05)} ${f(width * 0.56)} ${height} Z" fill="${C.path}"/>
${forest(r, -20, width * 0.3, ground + height * 0.12, 4, height / 210, height / 160, { pineShare: 0.5 })}
${forest(r, width * 0.72, width + 20, ground + height * 0.12, 4, height / 210, height / 160, { pineShare: 0.5 })}
${Array.from({ length: 10 }, () => flower(r() * width, ground + height * 0.1 + r() * height * 0.08, height / 220, r() < 0.5 ? C.pink : C.butter)).join("")}
`;
  return svg(width, height, body, defs);
}

// ----------------------------------------------------------------------------- Campus thumbnails
const campuses = {
  "campus-brick": (w, g) => brickHall(w * 0.28, g + 2, w * 0.44, g * 0.34),
  "campus-sandstone": (w, g) => sandstoneQuad(w * 0.2, g + 2, w * 0.5, g * 0.26),
  "campus-gothic": (w, g) => gothicHall(w * 0.36, g + 2, w * 0.28, g * 0.36),
  "campus-dome": (w, g) => domeHall(w * 0.25, g + 2, w * 0.5, g * 0.4),
};
let seed = 11;
for (const [name, building] of Object.entries(campuses)) {
  writeFileSync(path.join(OUT, `${name}.svg`), campusScene({ width: 480, height: 240, building, seed: (seed += 7) }));
}

// ----------------------------------------------------------------------------- Panorama hero
{
  const width = 1600;
  const height = 420;
  const r = rng(5);
  const ground = height * 0.86;
  const body = `
<rect width="${width}" height="${height}" fill="url(#sky)"/>
${sun(1180, 92, 26)}
${cloud(180, 80, 1.4)}${cloud(520, 52, 1, 0.8)}${cloud(980, 70, 1.2, 0.9)}${cloud(1420, 110, 1.5)}
<path d="M0 260 Q200 200 420 240 T860 225 T1300 240 T1600 220 V${height} H0 Z" fill="${C.hillFar}"/>
${forest(r, -20, 1620, 300, 70, 0.8, 1.15, { jitter: 18 })}
${brickHall(250, 352, 260, 120)}
${gothicHall(760, 352, 150, 110)}
${sandstoneQuad(1150, 352, 220, 80)}
${domeHall(560, 354, 140, 90)}
<path d="M0 ${f(ground)} Q400 ${f(ground - 30)} 800 ${f(ground - 10)} T1600 ${f(ground - 18)} V${height} H0 Z" fill="${C.hill}"/>
${forest(r, -30, 200, ground + 10, 6, 1.4, 1.9, { pineShare: 0.6 })}
${forest(r, 1380, 1640, ground + 10, 6, 1.4, 1.9, { pineShare: 0.6 })}
${forest(r, 900, 1100, ground + 18, 3, 1.2, 1.5)}
${Array.from({ length: 24 }, () => flower(r() * width, ground + 20 + r() * 30, 1.4, r() < 0.5 ? C.pink : C.butter)).join("")}
`;
  writeFileSync(path.join(OUT, "campus-panorama.svg"), svg(width, height, body, skyGradient("sky")));
}

// ----------------------------------------------------------------------------- Journey map
{
  const width = 1200;
  const height = 760;
  const r = rng(42);
  const river = "M-20 120 C140 160 220 260 330 300 S520 360 560 470 S640 640 760 690 S980 740 1220 720";
  const avoid = (x, y) => {
    const nearRiver = (px, py) => {
      // Sample the river curve roughly; keep trees off the water.
      const samples = [
        [0, 125], [120, 160], [220, 240], [330, 300], [440, 330], [530, 400], [570, 480], [620, 590], [700, 670], [800, 700], [950, 730], [1100, 725],
      ];
      return samples.some(([sx, sy]) => Math.hypot(sx - px, sy - py) < 70);
    };
    const inLake = Math.hypot((x - 170) / 150, (y - 600) / 100) < 1.15;
    return nearRiver(x, y) || inLake;
  };
  const trees = [];
  for (let index = 0; index < 260; index += 1) {
    const x = r() * width;
    const y = 150 + r() * (height - 150);
    if (avoid(x, y)) continue;
    const s = 0.55 + r() * 0.45;
    trees.push([y, r() < 0.5 ? pine(x, y, s, r() < 0.5 ? C.pine : C.leafDark) : roundTree(x, y, s, r() < 0.1 ? C.autumn : r() < 0.12 ? C.blossom : C.leaf)]);
  }
  const body = `
<rect width="${width}" height="${height}" fill="${C.meadow}"/>
<rect width="${width}" height="160" fill="url(#sky)"/>
${cloud(160, 50, 1.1)}${cloud(620, 36, 0.9, 0.85)}${cloud(1040, 58, 1.2)}
<path d="M300 170 L420 70 L520 150 L640 40 L780 160 L900 80 L1030 170 L1200 110 V200 H300 Z" fill="${C.mountain}"/>
<path d="M640 40 L600 90 L625 85 L645 100 L668 78 L690 90 Z M420 70 L392 95 L415 92 L432 104 L448 88 Z M900 80 L872 106 L895 100 L912 112 L928 98 Z" fill="${C.snow}"/>
<path d="M0 190 Q260 140 520 185 T1200 175 V220 H0 Z" fill="${C.hillFar}"/>
${Array.from({ length: 70 }, () => `<ellipse cx="${f(r() * width)}" cy="${f(220 + r() * (height - 220))}" rx="${f(20 + r() * 40)}" ry="${f(8 + r() * 14)}" fill="${C.meadowDark}" opacity="0.6"/>`).join("")}
<path d="${river}" fill="none" stroke="${C.water}" stroke-width="58" stroke-linecap="round"/>
<path d="${river}" fill="none" stroke="${C.waterLight}" stroke-width="16" stroke-linecap="round" stroke-dasharray="40 70" opacity="0.8"/>
<ellipse cx="170" cy="600" rx="150" ry="100" fill="${C.water}"/>
<ellipse cx="150" cy="590" rx="90" ry="50" fill="${C.waterLight}" opacity="0.5"/>
<g transform="translate(205 610)"><path d="M-22 6 H22 L14 16 H-14 Z" fill="${C.ivory}"/><line x1="0" y1="6" x2="0" y2="-26" stroke="${C.brown}" stroke-width="2"/><path d="M2 -24 L20 2 H2 Z" fill="${C.white}"/><path d="M-2 -18 L-16 2 H-2 Z" fill="${C.roseLight}"/></g>
<g transform="translate(560 470)"><rect x="-40" y="-8" width="80" height="12" fill="${C.trunk}"/><rect x="-36" y="-14" width="4" height="10" fill="${C.trunk}"/><rect x="32" y="-14" width="4" height="10" fill="${C.trunk}"/></g>
${trees.sort((a, b) => a[0] - b[0]).map((item) => item[1]).join("\n")}
${Array.from({ length: 50 }, () => {
  const x = r() * width;
  const y = 230 + r() * (height - 240);
  return avoid(x, y) ? "" : flower(x, y, 1, r() < 0.5 ? C.pink : C.butter);
}).join("")}
<g transform="translate(1100 300)">${brickHall(-30, 0, 60, 26).replace(/<g>/, "<g>")}</g>
<g transform="translate(980 540)"><rect x="-14" y="-18" width="28" height="18" fill="${C.ivory}"/><polygon points="-18,-18 18,-18 0,-32" fill="${C.tile}"/><rect x="-4" y="-10" width="8" height="10" fill="${C.windowDark}"/></g>
<g transform="translate(300 420)"><rect x="-14" y="-18" width="28" height="18" fill="${C.ivory}"/><polygon points="-18,-18 18,-18 0,-32" fill="${C.roof}"/><rect x="-4" y="-10" width="8" height="10" fill="${C.windowDark}"/></g>
`;
  writeFileSync(path.join(OUT, "map-landscape.svg"), svg(width, height, body, skyGradient("sky", [C.skyTop, C.skyLow])));
}

// ----------------------------------------------------------------------------- Small decorations
writeFileSync(
  path.join(OUT, "flowers.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 140" width="120" height="140">
<path d="M20 138 Q30 90 26 60 M60 138 Q58 80 66 40 M98 138 Q92 96 100 70" fill="none" stroke="${C.leafDark}" stroke-width="3" stroke-linecap="round"/>
<path d="M28 100 Q8 92 6 76 Q22 80 28 100 Z M62 96 Q84 88 88 70 Q70 74 62 96 Z M96 110 Q114 104 116 90 Q100 94 96 110 Z M60 70 Q40 62 38 48 Q54 54 60 70 Z" fill="${C.leaf}"/>
${[[26, 56, C.pink], [66, 36, C.butter], [100, 66, C.roseLight]]
  .map(([x, y, color]) =>
    [0, 60, 120, 180, 240, 300]
      .map((deg) => `<ellipse cx="${f(x + Math.cos((deg * Math.PI) / 180) * 8)}" cy="${f(y + Math.sin((deg * Math.PI) / 180) * 8)}" rx="7" ry="5" transform="rotate(${deg} ${f(x + Math.cos((deg * Math.PI) / 180) * 8)} ${f(y + Math.sin((deg * Math.PI) / 180) * 8)})" fill="${color}"/>`)
      .join("") + `<circle cx="${x}" cy="${y}" r="5" fill="${color === C.butter ? C.autumn : C.butter}"/>`,
  )
  .join("")}
</svg>\n`,
);

writeFileSync(
  path.join(OUT, "books.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 110" width="160" height="110">
<ellipse cx="80" cy="104" rx="72" ry="6" fill="#000" opacity="0.08"/>
<rect x="14" y="78" width="132" height="22" rx="3" fill="${C.sage}"/><rect x="18" y="82" width="124" height="3" fill="${C.ivory}" opacity="0.7"/>
<rect x="22" y="56" width="118" height="22" rx="3" fill="${C.rose}"/><rect x="26" y="60" width="110" height="3" fill="${C.ivory}" opacity="0.7"/>
<rect x="30" y="34" width="100" height="22" rx="3" fill="${C.blue}"/><rect x="34" y="38" width="92" height="3" fill="${C.ivory}" opacity="0.7"/>
<path d="M96 34 L104 12 L112 34 Z" fill="${C.butter}"/><rect x="102" y="8" width="4" height="8" fill="${C.rose}"/>
</svg>\n`,
);

writeFileSync(
  path.join(OUT, "signpost.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 260" width="220" height="260">
<ellipse cx="110" cy="250" rx="90" ry="9" fill="#000" opacity="0.08"/>
<rect x="102" y="20" width="16" height="230" rx="3" fill="${C.trunk}"/>
${[["EXPLORE", 40, 1], ["PLAN", 100, -1], ["APPLY", 160, 1]]
  .map(([label, y, dir]) => {
    const x0 = dir === 1 ? 60 : 30;
    const x1 = dir === 1 ? 190 : 160;
    const tip = dir === 1 ? `${x1 + 18},${y + 20}` : `${x0 - 18},${y + 20}`;
    return `<polygon points="${x0},${y} ${x1},${y} ${dir === 1 ? tip : `${x1},${y}`} ${x1},${y + 40} ${x0},${y + 40} ${dir === 1 ? `${x0},${y}` : tip}" fill="${C.butter}" stroke="${C.sandstoneDark}" stroke-width="3"/>
<text x="${(x0 + x1) / 2}" y="${y + 27}" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="18" fill="${C.brown}">${label}</text>`;
  })
  .join("")}
</svg>\n`,
);

// ----------------------------------------------------------------------------- Landing desk scene
writeFileSync(
  path.join(OUT, "desk-scene.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 420" width="1200" height="420" preserveAspectRatio="xMidYMax meet">
<defs><clipPath id="screen"><rect x="430" y="100" width="340" height="200" rx="6"/></clipPath></defs>
<path d="M0 330 H1200 V420 H0 Z" fill="#D9B48F"/>
<path d="M0 330 H1200 V342 H0 Z" fill="#C79D76"/>
<g transform="translate(60 160)">
<rect x="0" y="120" width="220" height="50" rx="4" fill="${C.sage}"/><text x="110" y="153" text-anchor="middle" font-family="Georgia, serif" font-size="26" font-weight="700" fill="${C.ivory}" letter-spacing="3">EXPLORE</text>
<rect x="10" y="70" width="200" height="50" rx="4" fill="${C.rose}"/><text x="110" y="103" text-anchor="middle" font-family="Georgia, serif" font-size="26" font-weight="700" fill="${C.ivory}" letter-spacing="3">APPLY</text>
<rect x="20" y="20" width="180" height="50" rx="4" fill="${C.blue}"/><text x="110" y="53" text-anchor="middle" font-family="Georgia, serif" font-size="26" font-weight="700" fill="${C.ivory}" letter-spacing="3">DREAM</text>
</g>
<rect x="414" y="86" width="372" height="232" rx="14" fill="#5E5452"/>
<rect x="430" y="100" width="340" height="200" rx="6" fill="${C.meadow}"/>
<g clip-path="url(#screen)">
<path d="M420 140 C500 170 560 210 600 230 S700 290 790 280" fill="none" stroke="${C.water}" stroke-width="22"/>
${[[480, 150], [520, 250], [560, 120], [640, 180], [700, 140], [740, 250], [460, 210], [610, 270], [680, 220]].map(([x, y]) => roundTree(x, y, 0.45)).join("")}
${[[530, 180, C.rose], [650, 150, C.rose], [700, 210, C.blue]].map(([x, y, color]) => `<path d="M${x} ${y} c-10 -12 -10 -22 0 -26 c10 4 10 14 0 26 Z" fill="${color}"/><circle cx="${x}" cy="${y - 18}" r="3.5" fill="#fff"/>`).join("")}
<path d="M530 180 Q590 200 650 150 Q690 180 700 210" fill="none" stroke="${C.brown}" stroke-width="2" stroke-dasharray="5 5"/>
</g>
<path d="M370 318 H830 L800 336 H400 Z" fill="#7A6E6B"/>
<g transform="translate(880 230)">
<rect x="0" y="20" width="70" height="80" rx="10" fill="${C.ivory}"/><path d="M70 40 Q100 44 96 66 Q92 84 70 82" fill="none" stroke="${C.ivory}" stroke-width="10"/>
<path d="M14 6 Q20 -6 14 -16 M34 6 Q40 -6 34 -18 M54 6 Q60 -6 54 -16" fill="none" stroke="${C.brown}" stroke-width="2" opacity="0.4"/>
</g>
<g transform="translate(990 270) rotate(-6)"><rect x="0" y="0" width="150" height="60" rx="4" fill="${C.ivory}"/><path d="M75 0 V60" stroke="${C.stoneDark}" stroke-width="2"/>${[12, 22, 32, 42].map((y) => `<line x1="10" y1="${y}" x2="66" y2="${y}" stroke="${C.stoneDark}" stroke-width="1.5"/><line x1="84" y1="${y}" x2="140" y2="${y}" stroke="${C.stoneDark}" stroke-width="1.5"/>`).join("")}<rect x="40" y="56" width="110" height="5" rx="2" fill="${C.butter}" transform="rotate(10 40 56)"/></g>
</svg>\n`,
);

console.log(`Wrote illustrations to ${OUT}`);
