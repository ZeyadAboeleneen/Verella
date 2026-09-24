/**
 * One-off builder for the launch catalog's photos.
 *
 *   pnpm tsx scripts/build-catalog-images.mts <mapping.json> <originals-dir> <cutouts-dir> [folder...]
 *
 * mapping.json: [{ folder: "p01-special-musk", src: "media/image4.png" }, …]
 * — `src` relative to <originals-dir>, cut-outs at <cutouts-dir>/<folder>.png
 * (made with rembg/BiRefNet, see docs/SETUP.md → Product images).
 *
 * For each product folder it writes to public/products/<folder>/:
 *   original.png  — the supplier photo, byte-for-byte (never re-encoded)
 *   styled.webp   — the cut-out on a Verella backdrop (lib/media/styled-image)
 * and one colour card per category to public/categories/<slug>.webp.
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { CATALOG_CATEGORIES } from "../../../packages/db/src/catalog/categories";
import { composeScene, composeStyledImage } from "../src/lib/media/styled-image";

const [mappingPath, originalsDir, cutoutsDir, ...only] = process.argv.slice(2);
if (!mappingPath || !originalsDir || !cutoutsDir) {
  console.error("usage: build-catalog-images.mts <mapping.json> <originals-dir> <cutouts-dir> [folder...]");
  process.exit(1);
}

const publicDir = path.resolve(import.meta.dirname, "../public");
const mapping: { folder: string; src: string }[] = JSON.parse(readFileSync(mappingPath, "utf8"));
const cutout = (folder: string) => readFileSync(path.join(cutoutsDir, `${folder}.png`));

for (const { folder, src } of mapping) {
  if (only.length > 0 && !only.includes(folder)) continue;
  const dir = path.join(publicDir, "products", folder);
  mkdirSync(dir, { recursive: true });
  copyFileSync(path.join(originalsDir, src), path.join(dir, "original.png"));
  const styled = await composeStyledImage(cutout(folder), { seed: folder });
  writeFileSync(path.join(dir, "styled.webp"), styled.buffer);
  console.log(`${folder}  hue ${styled.palette.hue.toFixed(0)}${styled.palette.neutral ? " (neutral)" : ""}`);
}

// Category cards: two or three products on the colour of the middle one.
if (only.length === 0 || only.includes("categories")) {
  mkdirSync(path.join(publicDir, "categories"), { recursive: true });
  for (const c of CATALOG_CATEGORIES) {
    const lead = c.cover[Math.floor(c.cover.length / 2)];
    const { palette } = await composeStyledImage(cutout(lead), { seed: lead });
    const scene = await composeScene(c.cover.map(cutout), { width: 2000, height: 1400, anchorX: 0.6, palette });
    writeFileSync(path.join(publicDir, "categories", `${c.slug}.webp`), scene.buffer);
    console.log(`category ${c.slug}: ${c.cover.join(", ")}`);
  }
}
