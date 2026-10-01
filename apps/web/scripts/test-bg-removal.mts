/**
 * Offline check of the automatic styled product image:
 *   pnpm tsx scripts/test-bg-removal.mts <input-image> <out-dir>
 * Writes cutout.png and styled.webp. Nothing is uploaded.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { removeBackground } from "../src/lib/media/background-removal";
import { composeStyledImage } from "../src/lib/media/styled-image";

const [input, outDir = "bg-test"] = process.argv.slice(2);
if (!input) {
  console.error("usage: test-bg-removal.mts <input-image> [out-dir]");
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });
const t0 = Date.now();
const cutout = await removeBackground(readFileSync(input));
console.log(`cut-out in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
writeFileSync(path.join(outDir, "cutout.png"), cutout);
const styled = await composeStyledImage(cutout, { seed: path.basename(input) });
writeFileSync(path.join(outDir, "styled.webp"), styled.buffer);
console.log(`styled in ${((Date.now() - t0) / 1000).toFixed(1)}s total, hue ${styled.palette.hue.toFixed(0)}`);
