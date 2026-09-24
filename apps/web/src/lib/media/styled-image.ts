import sharp from "sharp";

/**
 * Builds Verella's "styled" product photo from a cut-out (RGBA PNG whose alpha
 * marks the product). The product's own pixels are never repainted — only
 * scaled and placed. Around it we draw a studio backdrop tinted from the
 * product's colour: soft gradient, a glow disc, a floor, a contact shadow and
 * a cropped V mark at the edge, so every photo belongs to the same colourful
 * visual world as the site.
 *
 * Deliberately free of `server-only` so the batch script (tsx) can import it.
 */

export interface Palette {
  hue: number;
  sat: number;
  /** Product had too little colour to tint by (white, black, silver…). */
  neutral: boolean;
}

interface Cutout {
  data: Buffer;
  width: number;
  height: number;
  bbox: { left: number; top: number; width: number; height: number };
  palette: Palette;
}

const ALPHA_SOLID = 12;

/**
 * Colourless products (white, black, silver glass) have no hue to borrow, so
 * they get one of these — champagne, rose, sage, sky, lilac, apricot — picked
 * from a stable hash of `seed` so a product always gets the same one.
 */
const NEUTRAL_PALETTES: Palette[] = [
  { hue: 38, sat: 0.55, neutral: true },
  { hue: 350, sat: 0.5, neutral: true },
  { hue: 150, sat: 0.32, neutral: true },
  { hue: 205, sat: 0.5, neutral: true },
  { hue: 272, sat: 0.38, neutral: true },
  { hue: 22, sat: 0.6, neutral: true },
];

function neutralPalette(seed: string): Palette {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return NEUTRAL_PALETTES[h % NEUTRAL_PALETTES.length];
}

async function loadCutout(input: Buffer, seed = ""): Promise<Cutout> {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  let minX = width, minY = height, maxX = -1, maxY = -1;
  let x2 = 0, y2 = 0, weight = 0, colourful = 0, opaque = 0, satSum = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const a = data[i + 3];
      if (a <= ALPHA_SOLID) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (a < 200 || (x + y) % 3 !== 0) continue; // sample the solid body
      opaque++;
      const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const v = max, s = max === 0 ? 0 : (max - min) / max;
      if (s < 0.22 || v < 0.18 || v > 0.985) continue;
      colourful++;
      let h: number;
      if (max === r) h = ((g - b) / (max - min)) % 6;
      else if (max === g) h = (b - r) / (max - min) + 2;
      else h = (r - g) / (max - min) + 4;
      const rad = (h * 60 * Math.PI) / 180;
      const w = s * v;
      x2 += Math.cos(rad) * w;
      y2 += Math.sin(rad) * w;
      weight += w;
      satSum += s * w;
    }
  }
  if (maxX < 0) throw new Error("Cut-out is empty — nothing to place.");

  const neutral = opaque === 0 || colourful / opaque < 0.08;
  const palette = neutral
    ? neutralPalette(seed)
    : { hue: ((Math.atan2(y2, x2) * 180) / Math.PI + 360) % 360, sat: Math.min(1, satSum / weight), neutral: false };

  // Edge decontamination: semi-transparent edge pixels still carry the old
  // white backdrop mixed in (a pale halo on colour). Un-mix it. Solid pixels
  // — the product itself — are left exactly as they were.
  const out = Buffer.from(data);
  for (let i = 0; i < out.length; i += 4) {
    const a = out[i + 3] / 255;
    if (a <= 0.04 || a >= 0.96) continue;
    for (let c = 0; c < 3; c++) {
      out[i + c] = Math.max(0, Math.min(255, Math.round((out[i + c] - (1 - a) * 255) / a)));
    }
  }

  return {
    data: out,
    width,
    height,
    bbox: { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 },
    palette,
  };
}

/** HSL string for SVG. */
function hsl(h: number, s: number, l: number) {
  return `hsl(${h.toFixed(1)}, ${(s * 100).toFixed(1)}%, ${(l * 100).toFixed(1)}%)`;
}

function tones(p: Palette) {
  const s = Math.max(0.42, Math.min(0.78, p.sat));
  return {
    top: hsl(p.hue, s * 0.85, 0.9),
    bottom: hsl(p.hue, s, 0.74),
    glow: hsl(p.hue, s * 0.7, 0.97),
    floor: hsl(p.hue, s, 0.68),
    mark: hsl(p.hue, s, 0.62),
    shadow: { h: p.hue, s: 0.4, l: 0.18 },
  };
}

function backdropSvg(w: number, h: number, floorY: number, p: Palette, shadows: { cx: number; rx: number }[]) {
  const t = tones(p);
  const markH = h * 0.62;
  const markScale = markH / 325;
  const markX = w - 314 * markScale * 0.62;
  const markY = h * 0.06;
  const ellipses = shadows
    .map(
      (s) =>
        `<ellipse cx="${s.cx}" cy="${floorY}" rx="${s.rx}" ry="${Math.max(10, h * 0.018)}" fill="${hsl(t.shadow.h, t.shadow.s, t.shadow.l)}" opacity="0.32" filter="url(#soft)"/>`,
    )
    .join("");
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${t.top}"/><stop offset="1" stop-color="${t.bottom}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.44" r="0.5">
      <stop offset="0" stop-color="${t.glow}" stop-opacity="1"/>
      <stop offset="0.65" stop-color="${t.glow}" stop-opacity="0.55"/>
      <stop offset="1" stop-color="${t.glow}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${t.floor}" stop-opacity="0.55"/>
      <stop offset="0.35" stop-color="${t.bottom}" stop-opacity="0.9"/>
      <stop offset="1" stop-color="${t.bottom}" stop-opacity="1"/>
    </linearGradient>
    <filter id="soft" x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation="${Math.round(h * 0.012)}"/></filter>
    <filter id="haze"><feGaussianBlur stdDeviation="${Math.round(h * 0.004)}"/></filter>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <g transform="translate(${markX} ${markY}) scale(${markScale})" opacity="0.28" filter="url(#haze)">
    <g fill="none" stroke="${t.mark}" stroke-width="42" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22.5 21 L157 304 L291.5 21"/><path d="M93.5 21 L157 154 L220.5 21"/>
    </g>
  </g>
  <ellipse cx="${w / 2}" cy="${h * 0.45}" rx="${w * 0.46}" ry="${w * 0.46}" fill="url(#glow)"/>
  <rect y="${floorY}" width="${w}" height="${h - floorY}" fill="url(#floor)"/>
  <rect y="${floorY - 1}" width="${w}" height="2" fill="${t.glow}" opacity="0.55"/>
  ${ellipses}
</svg>`);
}

interface Placed {
  input: Buffer;
  left: number;
  top: number;
  width: number;
  height: number;
}

async function placeProduct(c: Cutout, maxW: number, maxH: number): Promise<Omit<Placed, "left" | "top">> {
  const scale = Math.min(maxW / c.bbox.width, maxH / c.bbox.height);
  const width = Math.max(1, Math.round(c.bbox.width * scale));
  const height = Math.max(1, Math.round(c.bbox.height * scale));
  const input = await sharp(c.data, { raw: { width: c.width, height: c.height, channels: 4 } })
    .extract(c.bbox)
    .resize(width, height, { kernel: "lanczos3" })
    .png()
    .toBuffer();
  return { input, width, height };
}

/** Soft, product-shaped shadow falling slightly behind and below. */
async function productShadow(product: Placed, p: Palette, blur: number): Promise<Placed> {
  const { data, info } = await sharp(product.input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const [r, g, b] = hslToRgb(p.hue / 360, 0.3, 0.18);
  const pad = blur * 3;
  const w = info.width + pad * 2, h = info.height + pad * 2;
  const buf = Buffer.alloc(w * h * 4);
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const si = (y * info.width + x) * 4;
      const di = ((y + pad) * w + (x + pad)) * 4;
      buf[di] = r; buf[di + 1] = g; buf[di + 2] = b;
      buf[di + 3] = Math.round(data[si + 3] * 0.16);
    }
  }
  const input = await sharp(buf, { raw: { width: w, height: h, channels: 4 } }).blur(blur).png().toBuffer();
  return { input, left: product.left - pad + Math.round(blur * 0.6), top: product.top - pad + Math.round(blur * 0.9), width: w, height: h };
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const k = (n: number) => (n + h * 12) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

export interface StyledImageResult {
  buffer: Buffer;
  width: number;
  height: number;
  palette: Palette;
}

/**
 * One product, portrait 4:5 — the storefront's card and gallery ratio.
 * Pass `palette` to force a tint, and `seed` (e.g. the file name) to pick the
 * accent colour for colourless products.
 */
export async function composeStyledImage(
  cutoutPng: Buffer,
  { width = 1200, height = 1500, palette, seed }: { width?: number; height?: number; palette?: Palette; seed?: string } = {},
): Promise<StyledImageResult> {
  const cut = await loadCutout(cutoutPng, seed);
  const pal = palette ?? cut.palette;
  const floorY = Math.round(height * 0.8);
  const sized = await placeProduct(cut, width * 0.62, height * 0.58);
  const product: Placed = {
    ...sized,
    left: Math.round((width - sized.width) / 2),
    top: floorY + Math.round(height * 0.012) - sized.height,
  };
  const shadow = await productShadow(product, pal, Math.round(width * 0.022));
  const buffer = await sharp(backdropSvg(width, height, floorY, pal, [{ cx: width / 2, rx: sized.width * 0.46 }]))
    .composite([shadow, product].map((l) => ({ input: l.input, left: l.left, top: l.top })))
    .webp({ quality: 90 })
    .toBuffer();
  return { buffer, width, height, palette: pal };
}

/**
 * Several products side by side on one backdrop — category covers and hero
 * banners. `anchorX` (0–1) is where the group is centred horizontally.
 */
export async function composeScene(
  cutouts: Buffer[],
  { width, height, anchorX = 0.5, palette }: { width: number; height: number; anchorX?: number; palette?: Palette },
): Promise<StyledImageResult> {
  const cuts = await Promise.all(cutouts.map((c) => loadCutout(c)));
  const pal = palette ?? cuts[0].palette;
  const floorY = Math.round(height * 0.82);
  const gap = width * 0.025;
  const maxGroupW = width * 0.72;
  // Middle item is tallest; neighbours step down for rhythm. Widths follow
  // each item's own proportions, then the whole group shrinks to fit.
  const mid = Math.floor(cuts.length / 2);
  let heights = cuts.map((_, i) => height * (i === mid ? 0.6 : 0.5));
  const widthFor = (c: Cutout, h: number) => (c.bbox.width / c.bbox.height) * h;
  const total = cuts.reduce((sum, c, i) => sum + widthFor(c, heights[i]), 0) + gap * (cuts.length - 1);
  if (total > maxGroupW) heights = heights.map((h) => h * ((maxGroupW - gap * (cuts.length - 1)) / (total - gap * (cuts.length - 1))));
  const sized = await Promise.all(cuts.map((c, i) => placeProduct(c, widthFor(c, heights[i]) + 1, heights[i])));
  const groupW = sized.reduce((s, p) => s + p.width, 0) + gap * (sized.length - 1);
  let x = Math.round(width * anchorX - groupW / 2);
  const placed: Placed[] = sized.map((p) => {
    const item = { ...p, left: x, top: floorY + Math.round(height * 0.012) - p.height };
    x += p.width + gap;
    return item;
  });
  const shadows = await Promise.all(placed.map((p) => productShadow(p, pal, Math.round(height * 0.02))));
  const buffer = await sharp(
    backdropSvg(width, height, floorY, pal, placed.map((p) => ({ cx: p.left + p.width / 2, rx: p.width * 0.46 }))),
  )
    .composite([...shadows, ...placed].map((l) => ({ input: l.input, left: l.left, top: l.top })))
    .webp({ quality: 88 })
    .toBuffer();
  return { buffer, width, height, palette: pal };
}
